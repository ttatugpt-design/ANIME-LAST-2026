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

func (h *BackupHandler) GetBackupStats(c *gin.Context) {
	var animeCount int64
	var episodeCount int64
	var userCount int64
	var accountCount int64
	var commentCount int64

	h.repo.DB().Table("animes").Count(&animeCount)
	h.repo.DB().Table("episodes").Count(&episodeCount)
	h.repo.DB().Table("users").Count(&userCount)
	h.repo.DB().Table("embed_accounts").Count(&accountCount)
	h.repo.DB().Table("comments").Count(&commentCount)

	c.JSON(http.StatusOK, gin.H{
		"animes":         animeCount,
		"episodes":       episodeCount,
		"users":          userCount,
		"embed_accounts": accountCount,
		"comments":       commentCount,
	})
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

	if err := h.performRestore(backupPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Restore failed: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Database restored successfully. Server is restarting to apply changes..."})
	// Schedule a graceful restart so ALL repositories get fresh connections
	h.scheduleRestart()
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

	if err := h.performRestore(tempPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Restore failed: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Uploaded backup restored successfully. Server is restarting to apply changes..."})
	// Schedule a graceful restart so ALL repositories get fresh connections
	h.scheduleRestart()
}

// scheduleRestart gracefully exits the process after a short delay.
// Railway's restart policy will automatically restart the service with fresh DB connections.
func (h *BackupHandler) scheduleRestart() {
	go func() {
		time.Sleep(3 * time.Second)
		log.Println("[RESTORE] Triggering server restart to refresh all database connections...")
		os.Exit(1) // Exit code 1 triggers Railway's ON_FAILURE restart policy
	}()
}

func (h *BackupHandler) performRestore(backupPath string) error {
	log.Printf("[RESTORE START] Attempting to restore database from: %s", backupPath)

	// Get the underlying *sql.DB
	sqlDB, err := h.repo.DB().DB()
	if err != nil {
		return fmt.Errorf("failed to get DB instance: %v", err)
	}

	// 1. Force flush and close all connections
	sqlDB.SetMaxOpenConns(0)
	sqlDB.SetConnMaxLifetime(0)
	
	if err := sqlDB.Close(); err != nil {
		log.Printf("[RESTORE] Warning: failed to close DB before restore: %v", err)
	}

	// 2. Aggressively purge any cached SQLite state files
	// This is the CRITICAL STEP to prevent data conflicts
	log.Println("[RESTORE] Purging existing database and WAL/SHM files...")
	os.Remove(h.cfg.DBUrl)
	os.Remove(h.cfg.DBUrl + "-wal")
	os.Remove(h.cfg.DBUrl + "-shm")
	os.Remove(h.cfg.DBUrl + "-journal")

	// 3. Copy the backup file to the live DB path
	log.Printf("[RESTORE] Copying backup to live path: %s", h.cfg.DBUrl)
	if err := h.copyFile(backupPath, h.cfg.DBUrl); err != nil {
		// Attempt to reopen to prevent infinite crash loop
		log.Printf("[RESTORE ERROR] Build copy failed: %v", err)
		h.repo.ReopenWithDSN(h.cfg.DBUrl)
		return fmt.Errorf("failed to copy backup to live DB: %v", err)
	}

	// 4. Verification Check
	if _, err := os.Stat(h.cfg.DBUrl); err != nil {
		return fmt.Errorf("restored DB file missing after copy: %v", err)
	}

	// 5. Reopen the database fresh
	log.Println("[RESTORE] Reopening database with fresh connection pool...")
	if err := h.repo.ReopenWithDSN(h.cfg.DBUrl); err != nil {
		return fmt.Errorf("failed to reopen DB after restore: %v", err)
	}

	log.Printf("[RESTORE SUCCESS] Database fully replaced. New size: %d bytes", h.getFileSize(h.cfg.DBUrl))
	return nil
}

func (h *BackupHandler) getFileSize(path string) int64 {
	info, err := os.Stat(path)
	if err != nil {
		return 0
	}
	return info.Size()
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
