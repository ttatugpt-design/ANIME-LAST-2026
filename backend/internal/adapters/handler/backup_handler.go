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
	// 1. Close current DB
	err := h.repo.Reopen(h.cfg.DBUrl) // This is just to ensure it's re-openable, but wait
	// Actually, we must CLOSE it, then COPY, then REOPEN.
	
	// Let's get the underlying SQL DB to close it
	sqlDB, _ := h.repo.DB().DB()
	if sqlDB != nil {
		sqlDB.Close()
	}

	// 2. Overwrite saas.db with backup
	err = h.copyFile(backupPath, h.cfg.DBUrl)
	if err != nil {
		return fmt.Errorf("failed to copy backup file to live DB: %v", err)
	}

	// 3. Re-open connection in repository
	// We need a way to tell the repo to re-open. I added Reopen method.
	// But since I closed it manually above, I just need to call Reopen with the same path.
	return h.repo.Reopen(h.cfg.DBUrl)
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
