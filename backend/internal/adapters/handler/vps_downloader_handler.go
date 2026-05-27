package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"backend/internal/core/service"

	"github.com/gin-gonic/gin"
)

type VPSDownloaderHandler struct {
	vpsService *service.VPSService
	baseDir    string
}

func NewVPSDownloaderHandler(vpsService *service.VPSService, baseDir string) *VPSDownloaderHandler {
	return &VPSDownloaderHandler{
		vpsService: vpsService,
		baseDir:    baseDir,
	}
}

type VPSDownloadRequest struct {
	AnimeName string   `json:"anime_name"`
	Links     []string `json:"links"`
}

func (h *VPSDownloaderHandler) Download(c *gin.Context) {
	if h.vpsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "VPS Service not initialized"})
		return
	}

	var req VPSDownloadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := h.vpsService.AddTask(req.AnimeName, req.Links, "download"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Download task queued", "anime_name": req.AnimeName})
}

func (h *VPSDownloaderHandler) GetStatus(c *gin.Context) {
	if h.vpsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "VPS Service not initialized"})
		return
	}

	animeName := c.Query("anime_name")
	if animeName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Anime name is required"})
		return
	}

	tasks, err := h.vpsService.GetTasks(animeName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var items []gin.H
	isUploading := false
	uploadStatus := ""

	for _, t := range tasks {
		if t.Type == "download" {
			var links []string
			json.Unmarshal([]byte(t.Links), &links)

			// Get live per-link progress from in-memory tracking (for active tasks)
			liveProgress, liveStatus := h.vpsService.GetLinkProgress(t.ID)

			for i, link := range links {
				var itemStatus string
				var itemProgress float64

				if link == "" {
					itemStatus = "deleted"
					itemProgress = 0
				} else if t.Status == "completed" {
					itemStatus = "completed"
					itemProgress = 100
				} else if t.Status == "failed" {
					itemStatus = "error"
					itemProgress = 0
				} else if t.Status == "processing" {
					// Use live per-link data if available
					if i < len(liveStatus) && liveStatus[i] != "" {
						if liveStatus[i] == "failed" {
							itemStatus = "error"
						} else {
							itemStatus = liveStatus[i]
						}
					} else {
						itemStatus = "downloading"
					}
					if i < len(liveProgress) {
						itemProgress = liveProgress[i]
					} else {
						// Fallback: distribute global progress
						itemProgress = t.Progress
					}
				} else {
					itemStatus = "pending"
					itemProgress = 0
				}

				// If the link is deleted, we don't necessarily want to hide it completely,
				// but let's pass it to UI so it knows it's deleted.
				items = append(items, gin.H{
					"index":    i + 1,
					"link":     link,
					"status":   itemStatus,
					"progress": itemProgress,
					"eta":      "",
				})
			}
		} else if t.Type == "upload" {
			isUploading = (t.Status == "processing")
			uploadStatus = t.Status
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"anime_name":    animeName,
		"items":         items,
		"is_uploading":  isUploading,
		"upload_status": uploadStatus,
	})
}

func (h *VPSDownloaderHandler) ListFiles(c *gin.Context) {
	if h.vpsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "VPS Service not initialized"})
		return
	}

	remotePath := c.Query("path")
	if strings.TrimSpace(remotePath) == "" {
		remotePath = "/"
	}

	files, err := h.vpsService.ListDirectory(remotePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"path":  remotePath,
		"files": files,
	})
}

func (h *VPSDownloaderHandler) DeleteFile(c *gin.Context) {
	if h.vpsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "VPS Service not initialized"})
		return
	}

	remotePath := c.Query("path")
	if strings.TrimSpace(remotePath) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path parameter is required"})
		return
	}

	if err := h.vpsService.DeleteFile(remotePath); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "تم الحذف بنجاح", "path": remotePath})
}

func (h *VPSDownloaderHandler) RenameFile(c *gin.Context) {
	if h.vpsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "VPS Service not initialized"})
		return
	}
	var req struct {
		OldPath string `json:"old_path"`
		NewPath string `json:"new_path"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.OldPath) == "" || strings.TrimSpace(req.NewPath) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "old_path and new_path are required"})
		return
	}
	if err := h.vpsService.RenameFile(req.OldPath, req.NewPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "تمت إعادة التسمية بنجاح"})
}

func (h *VPSDownloaderHandler) MoveFiles(c *gin.Context) {
	if h.vpsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "VPS Service not initialized"})
		return
	}
	var req struct {
		Sources []string `json:"sources"`
		DestDir string   `json:"dest_dir"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Sources) == 0 || strings.TrimSpace(req.DestDir) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sources and dest_dir are required"})
		return
	}
	if err := h.vpsService.MoveFiles(req.Sources, req.DestDir); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("تم نقل %d عنصر بنجاح", len(req.Sources))})
}

func (h *VPSDownloaderHandler) DiskUsage(c *gin.Context) {
	if h.vpsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "VPS Service not initialized"})
		return
	}
	info, err := h.vpsService.GetDiskUsage()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, info)
}

func (h *VPSDownloaderHandler) MakeDir(c *gin.Context) {
	if h.vpsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "VPS Service not initialized"})
		return
	}
	var req struct {
		Path string `json:"path"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Path) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path is required"})
		return
	}
	if err := h.vpsService.MakeDirectory(req.Path); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "تم إنشاء المجلد بنجاح", "path": req.Path})
}

func (h *VPSDownloaderHandler) Extract(c *gin.Context) {
	if h.vpsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "VPS Service not initialized"})
		return
	}
	var req struct {
		ArchivePath string `json:"archive_path"`
		DestPath    string `json:"dest_path"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.ArchivePath) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "archive_path is required"})
		return
	}
	if err := h.vpsService.ExtractArchive(req.ArchivePath, req.DestPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "تم فك الضغط بنجاح", "archive": req.ArchivePath})
}

func (h *VPSDownloaderHandler) DownloadURL(c *gin.Context) {
	if h.vpsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "VPS Service not initialized"})
		return
	}
	var req struct {
		URL      string `json:"url"`
		DestDir  string `json:"dest_dir"`
		Filename string `json:"filename"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.URL) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url is required"})
		return
	}
	if err := h.vpsService.DownloadFromURL(req.URL, req.DestDir, req.Filename); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "تم التحميل بنجاح", "dest": req.DestDir})
}

func (h *VPSDownloaderHandler) UploadToPCloud(c *gin.Context) {
	if h.vpsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "VPS Service not initialized"})
		return
	}

	var req struct {
		AnimeName string `json:"anime_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := h.vpsService.AddTask(req.AnimeName, nil, "upload"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Upload task queued"})
}

func (h *VPSDownloaderHandler) DeepScrape(c *gin.Context) {
	var req struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL"})
		return
	}

	// Determine script path
	scriptPath := filepath.Join(h.baseDir, "backend", "scraper", "egydead_deep_scraper.js")
	if _, err := os.Stat(scriptPath); err != nil {
		// Try flattened path
		scriptPath = filepath.Join(h.baseDir, "scraper", "egydead_deep_scraper.js")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scriptPath, req.URL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Scraper failed",
			"details": stderr.String(),
		})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Failed to parse scraper output",
			"output": stdout.String(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *VPSDownloaderHandler) DeleteLink(c *gin.Context) {
	if h.vpsService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "VPS Service not initialized"})
		return
	}

	animeName := c.Query("anime_name")
	indexStr := c.Query("index")

	if animeName == "" || indexStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "anime_name and index are required"})
		return
	}

	var index int
	fmt.Sscanf(indexStr, "%d", &index)

	if err := h.vpsService.DeleteLink(animeName, index); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Link deleted successfully"})
}
