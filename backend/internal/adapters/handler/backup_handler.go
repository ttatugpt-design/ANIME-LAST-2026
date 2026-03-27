package handler

import (
	"backend/config"
	"backend/internal/adapters/repository"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
)

type BackupHandler struct {
	repo *repository.SQLiteRepository
	cfg  *config.Config
}

func NewBackupHandler(repo *repository.SQLiteRepository, cfg *config.Config) *BackupHandler {
	// Ensure backup dir exists
	if _, err := os.Stat(cfg.BackupDir); os.IsNotExist(err) {
		err := os.MkdirAll(cfg.BackupDir, 0755)
		if err != nil {
			fmt.Printf("Error creating backup directory: %v\n", err)
		}
	}
	log.Printf("Backup handler initialized with directory: %s", cfg.BackupDir)
	return &BackupHandler{repo: repo, cfg: cfg}
}

type BackupInfo struct {
	Filename string    `json:"filename"`
	Size     int64     `json:"size"`
	Date     time.Time `json:"date"`
}

func (h *BackupHandler) ListBackups(c *gin.Context) {
	files, err := os.ReadDir(h.cfg.BackupDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read backup directory"})
		return
	}

	var backups []BackupInfo
	for _, f := range files {
		if !f.IsDir() && filepath.Ext(f.Name()) == ".db" {
			info, err := f.Info()
			if err == nil {
				backups = append(backups, BackupInfo{
					Filename: f.Name(),
					Size:     info.Size(),
					Date:     info.ModTime(),
				})
			}
		}
	}

	// Sort by date descending
	sort.Slice(backups, func(i, j int) bool {
		return backups[i].Date.After(backups[j].Date)
	})

	c.JSON(http.StatusOK, backups)
}

func (h *BackupHandler) CreateBackup(c *gin.Context) {
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	backupFilename := fmt.Sprintf("db_backup_%s.db", timestamp)
	backupPath := filepath.Join(h.cfg.BackupDir, backupFilename)
	absBackupPath, err := filepath.Abs(backupPath)
	if err != nil {
		absBackupPath = backupPath // fallback
	}

	// Use SQLite VACUUM INTO for a safe online backup if possible
	err = h.repo.DB().Exec(fmt.Sprintf("VACUUM INTO '%s'", absBackupPath)).Error
	if err != nil {
		// Fallback to manual copy if VACUUM INTO fails
		err = h.copyFile(h.cfg.DBUrl, backupPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create backup: %v", err)})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Backup created successfully", "filename": backupFilename})
}

func (h *BackupHandler) DownloadBackup(c *gin.Context) {
	filename := c.Param("filename")
	// Prevent path traversal
	filename = filepath.Base(filename)
	backupPath := filepath.Join(h.cfg.BackupDir, filename)

	if _, err := os.Stat(backupPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Backup file not found"})
		return
	}

	c.File(backupPath)
}

func (h *BackupHandler) DeleteBackup(c *gin.Context) {
	filename := c.Param("filename")
	filename = filepath.Base(filename)
	backupPath := filepath.Join(h.cfg.BackupDir, filename)

	if err := os.Remove(backupPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete backup"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Backup deleted successfully"})
}

func (h *BackupHandler) RestoreBackup(c *gin.Context) {
	filename := c.Param("filename")
	filename = filepath.Base(filename)
	backupPath := filepath.Join(h.cfg.BackupDir, filename)

	if _, err := os.Stat(backupPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Backup file not found"})
		return
	}

	// Restore logic
	if err := h.performRestore(backupPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Restore failed: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Database restored successfully. System reconnected."})
}

func (h *BackupHandler) UploadAndRestore(c *gin.Context) {
	file, err := c.FormFile("backup")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	timestamp := time.Now().Format("2006-01-02_15-04-05")
	tempFilename := fmt.Sprintf("upload_%s_%s", timestamp, file.Filename)
	tempPath := filepath.Join(h.cfg.BackupDir, tempFilename)

	if err := c.SaveUploadedFile(file, tempPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded file"})
		return
	}

	// Restore from uploaded file
	if err := h.performRestore(tempPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Restore failed: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Uploaded backup restored successfully"})
}

func (h *BackupHandler) performRestore(backupPath string) error {
	// Get the underlying *sql.DB
	sqlDB, err := h.repo.DB().DB()
	if err != nil {
		return fmt.Errorf("failed to get DB instance: %v", err)
	}

	// 1. Flush all pending connections so file is not locked
	// Set max open conns to 0 to drain them, then reset to 1
	sqlDB.SetMaxOpenConns(0)

	// 2. Close the underlying connection pool
	if err := sqlDB.Close(); err != nil {
		log.Printf("Warning: failed to close DB before restore: %v", err)
	}

	// 3. Overwrite the live DB file with the backup
	if err := h.copyFile(backupPath, h.cfg.DBUrl); err != nil {
		// Try to reopen regardless so the server doesn't stay broken
		rerr := h.repo.ReopenWithDSN(h.cfg.DBUrl)
		if rerr != nil {
			log.Printf("[RESTORE CRITICAL] Failed to reopen DB after failed restore: %v", rerr)
		}
		return fmt.Errorf("failed to copy backup to live DB: %v", err)
	}

	// 4. Reopen the connection with the same pragmas
	if err := h.repo.ReopenWithDSN(h.cfg.DBUrl); err != nil {
		return fmt.Errorf("failed to reopen DB after restore: %v", err)
	}

	log.Printf("[RESTORE] Database restored successfully from %s", backupPath)
	return nil
}

func (h *BackupHandler) copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}
