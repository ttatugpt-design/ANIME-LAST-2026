package handler

import (
	"backend/internal/core/service"
	"fmt"
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

type ExportHandler struct {
	service *service.ExportService
}

func NewExportHandler(service *service.ExportService) *ExportHandler {
	return &ExportHandler{service: service}
}

// RetargetAndExport handles animation retargeting requests
// POST /api/export/retarget
func (h *ExportHandler) RetargetAndExport(c *gin.Context) {
	characterFile, err := c.FormFile("character")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "character file is required"})
		return
	}
	animationFile, err := c.FormFile("animation")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "animation file is required"})
		return
	}
	result, err := h.service.RetargetAndExport(characterFile, animationFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// AutoRig handles automatic rigging requests
// POST /api/export/autorig
func (h *ExportHandler) AutoRig(c *gin.Context) {
	characterFile, err := c.FormFile("character")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "character file is required"})
		return
	}
	result, err := h.service.AutoRigCharacter(characterFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// GenerateSprint handles procedural animation requests
// POST /api/export/sprint
func (h *ExportHandler) GenerateSprint(c *gin.Context) {
	characterFile, err := c.FormFile("character")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "character file is required"})
		return
	}
	result, err := h.service.GenerateSprintAnimation(characterFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// Download handles export file downloads
// GET /api/export/download/:filename
func (h *ExportHandler) Download(c *gin.Context) {
	filename := c.Param("filename")

	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "filename is required",
		})
		return
	}

	// Get file path from service
	filePath, err := h.service.GetExportFile(filename)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "file not found",
		})
		return
	}

	// Set headers for download
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filepath.Base(filename)))
	c.Header("Content-Type", "application/octet-stream")

	// Serve file
	c.File(filePath)
}
