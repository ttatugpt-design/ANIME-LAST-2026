package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

type ScraperHandler struct{}

func NewScraperHandler() *ScraperHandler {
	return &ScraperHandler{}
}

func (h *ScraperHandler) TestFetchLink(c *gin.Context) {
	var body struct {
		URL        string `json:"url"`
		SeriesName string `json:"series_name"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "بيانات غير صالحة"})
		return
	}

	if body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط"})
		return
	}

	// Determine the path to the scraper script
	currentDir, _ := os.Getwd()
	// Adjusting path to point to scraper/index.js relative to backend root
	// Assuming the server runs from backend/cmd/server or backend/
	scraperPath := filepath.Join(currentDir, "scraper", "index.js")

	// Execute the node script with a long timeout (15 minutes) for full series batching
	const batchTimeout = 15 * 60 * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), batchTimeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scraperPath, body.URL, body.SeriesName)
	
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		// Try to parse error from stderr if it's JSON
		var errData struct {
			Error string `json:"error"`
		}
		if jsonErr := json.Unmarshal(stderr.Bytes(), &errData); jsonErr == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Scraper Error: " + errData.Error})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to run scraper: " + err.Error(), "details": stderr.String()})
		return
	}

	// Parse the JSON output from stdout
	var result struct {
		Success bool `json:"success"`
		Links   []struct {
			Episode string `json:"episode"`
			Link    string `json:"link"`
		} `json:"links"`
		Error string `json:"error"`
	}

	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse scraper output", "output": stdout.String()})
		return
	}

	if result.Success && len(result.Links) > 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"links":   result.Links,
		})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "لم يتم العثور على روابط. يرجى التأكد من الرابط والموقع."})
}
