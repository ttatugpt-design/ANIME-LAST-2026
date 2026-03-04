package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"backend/internal/core/service"

	"github.com/gin-gonic/gin"
)

type AIHandler struct {
	aiService *service.AIService
}

func NewAIHandler(aiService *service.AIService) *AIHandler {
	return &AIHandler{
		aiService: aiService,
	}
}

func (h *AIHandler) Generate3D(c *gin.Context) {
	// 5 MB limit is default in Gin, but explicit check handles huge files better or rely on Nginx/Gin limit
	fileHeader, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Error retrieving image"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to open image"})
		return
	}
	defer file.Close()

	// Save temp file
	tempDir := "./uploads/temp"
	if _, err := os.Stat(tempDir); os.IsNotExist(err) {
		os.MkdirAll(tempDir, 0755)
	}

	tempFilePath := filepath.Join(tempDir, fmt.Sprintf("%d-%s", time.Now().Unix(), fileHeader.Filename))
	tempFile, err := os.Create(tempFilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error saving file"})
		return
	}
	defer tempFile.Close()

	if _, err := io.Copy(tempFile, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error saving file content"})
		return
	}
	tempFile.Close() // Ensure flush

	// Parse optional prompt from form
	prompt := c.PostForm("prompt")

	// Call Service
	taskID, err := h.aiService.Generate3DModel(tempFilePath, prompt)

	// Optional: defer os.Remove(tempFilePath)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"task_id": taskID,
		"status":  "QUEUED",
	})
}

func (h *AIHandler) CheckStatus(c *gin.Context) {
	taskID := c.Param("task_id")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task ID is required"})
		return
	}

	status, err := h.aiService.CheckTaskStatus(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, status)
}
