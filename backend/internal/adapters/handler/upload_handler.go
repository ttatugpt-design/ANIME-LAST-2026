package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UploadHandler struct {
	BaseDir string
}

func NewUploadHandler(baseDir string) *UploadHandler {
	return &UploadHandler{BaseDir: baseDir}
}

func (h *UploadHandler) UploadFile(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Optional parameters
	subFolder := c.Query("folder")        // e.g. "manga/Berserk/Chapter 1"
	useOriginal := c.Query("use_original") // "true" or ""
	customName := c.Query("filename")     // allow custom filename

	// Validate extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" && ext != ".gif" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only images allowed."})
		return
	}

	// Create uploads directory (Absolute path)
	uploadDir := filepath.Join(h.BaseDir, "backend", "uploads")
	if subFolder != "" {
		uploadDir = filepath.Join(uploadDir, subFolder)
	}

	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}

	// Generate filename
	var filename string
	if customName != "" {
		// Use custom name exactly as requested
		filename = fmt.Sprintf("%s%s", customName, ext)
	} else if useOriginal == "true" {
		filename = file.Filename
	} else {
		filename = fmt.Sprintf("%d_%s%s", time.Now().Unix(), uuid.New().String(), ext)
	}
	
	destPath := filepath.Join(uploadDir, filename)
	fmt.Printf("[UPLOAD] Saving to: %s\n", destPath)

	if err := c.SaveUploadedFile(file, destPath); err != nil {
		fmt.Printf("[UPLOAD] ERROR saving file: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}
	fmt.Printf("[UPLOAD] Successfully saved: %s\n", destPath)

	// Return relative URL (use forward slashes for URLs)
	finalUrl := ""
	if subFolder != "" {
		finalUrl = fmt.Sprintf("/uploads/%s/%s", strings.ReplaceAll(subFolder, "\\", "/"), filename)
	} else {
		finalUrl = fmt.Sprintf("/uploads/%s", filename)
	}
	
	c.JSON(http.StatusOK, gin.H{"url": finalUrl})
}
