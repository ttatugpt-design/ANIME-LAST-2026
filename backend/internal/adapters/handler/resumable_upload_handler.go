package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ResumableUploadHandler struct{}

func NewResumableUploadHandler() *ResumableUploadHandler {
	return &ResumableUploadHandler{}
}

func (h *ResumableUploadHandler) InitUpload(c *gin.Context) {
	fileName := c.Query("fileName")
	totalSize, _ := strconv.ParseInt(c.Query("totalSize"), 10, 64)

	uploadID := uuid.New().String()
	tempDir := filepath.Join("./uploads/temp", uploadID)

	if err := os.MkdirAll(tempDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temp directory"})
		return
	}

	// Store metadata for resuming if needed (optional)
	// For now, just return the ID
	c.JSON(http.StatusOK, gin.H{
		"uploadId": uploadID,
		"fileName": fileName,
		"totalSize": totalSize,
	})
}

func (h *ResumableUploadHandler) UploadChunk(c *gin.Context) {
	uploadID := c.PostForm("uploadId")
	chunkIndex := c.PostForm("chunkIndex")
	
	file, err := c.FormFile("chunk")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No chunk provided"})
		return
	}

	tempDir := filepath.Join("./uploads/temp", uploadID)
	if _, err := os.Stat(tempDir); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Upload ID not found"})
		return
	}

	destPath := filepath.Join(tempDir, fmt.Sprintf("%s.part", chunkIndex))
	if err := c.SaveUploadedFile(file, destPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save chunk"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Chunk uploaded successfully"})
}

func (h *ResumableUploadHandler) GetStatus(c *gin.Context) {
	uploadID := c.Param("uploadId")
	tempDir := filepath.Join("./uploads/temp", uploadID)

	files, err := os.ReadDir(tempDir)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Upload not found"})
		return
	}

	uploadedChunks := []int{}
	for _, f := range files {
		if filepath.Ext(f.Name()) == ".part" {
			idxStr := f.Name()[:len(f.Name())-5]
			idx, _ := strconv.Atoi(idxStr)
			uploadedChunks = append(uploadedChunks, idx)
		}
	}

	c.JSON(http.StatusOK, gin.H{"uploadedChunks": uploadedChunks})
}

func (h *ResumableUploadHandler) CompleteUpload(c *gin.Context) {
	uploadID := c.PostForm("uploadId")
	fileName := c.PostForm("fileName")
	
	tempDir := filepath.Join("./uploads/temp", uploadID)
	files, err := os.ReadDir(tempDir)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Temp files not found"})
		return
	}

	// Sort files by index
	var parts []string
	for _, f := range files {
		if filepath.Ext(f.Name()) == ".part" {
			parts = append(parts, f.Name())
		}
	}
	sort.Slice(parts, func(i, j int) bool {
		idxI, _ := strconv.Atoi(parts[i][:len(parts[i])-5])
		idxJ, _ := strconv.Atoi(parts[j][:len(parts[j])-5])
		return idxI < idxJ
	})

	// Create final file
	finalDir := "./uploads/finished"
	os.MkdirAll(finalDir, 0755)
	
	finalPath := filepath.Join(finalDir, fmt.Sprintf("%s_%s", uploadID, fileName))
	out, err := os.Create(finalPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create final file"})
		return
	}
	defer out.Close()

	for _, p := range parts {
		partPath := filepath.Join(tempDir, p)
		in, err := os.Open(partPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open part: " + p})
			return
		}
		_, err = io.Copy(out, in)
		in.Close()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to merge part: " + p})
			return
		}
	}

	// Clean up temp directory
	os.RemoveAll(tempDir)

	absPath, _ := filepath.Abs(finalPath)
	c.JSON(http.StatusOK, gin.H{
		"message": "Upload complete",
		"filePath": absPath,
		"relativeUrl": fmt.Sprintf("/uploads/finished/%s_%s", uploadID, fileName),
	})
}
