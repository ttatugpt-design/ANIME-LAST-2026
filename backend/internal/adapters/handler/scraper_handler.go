package handler

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"backend/internal/core/domain"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	RistoAnimeBatchScript = "backend/scraper/ristoanime_batch_scraper.js"
	WitAnimeBatchScript   = "backend/scraper/witanime_batch_scraper.js"
	AnimercoBatchScript   = "backend/scraper/animerco_batch_scraper.js"
)

type ScraperHandler struct {
	db      *gorm.DB
	BaseDir string
}

type AnimeImportRequest struct {
	Title       string   `json:"title"`
	Story       string   `json:"story"`
	Poster      string   `json:"poster"`
	Episodes    string   `json:"episodes"`
	Type        string   `json:"type"`
	Genres      []string `json:"genres"`
	Status      string   `json:"status"`
	Season      string   `json:"season"`
	MALUrl      string   `json:"malUrl"`
	DetailURL   string   `json:"detailUrl"`
	IsPublished bool     `json:"is_published"`
	AutoScrape  bool     `json:"auto_scrape"`
}

type AnimercoFullImportRequest struct {
	Title         string   `json:"title"`
	Story         string   `json:"story"`
	Poster        string   `json:"poster"`
	AnimeBanner   string   `json:"anime_banner"` // الغلاف الكبير من الصفحة الرئيسية للأنمي
	EpisodesCount string   `json:"episodes_count"`
	Type          string   `json:"type"`
	Genres        []string `json:"genres"`
	Status        string   `json:"status"`
	Season        string   `json:"season"`
	Episodes      []struct {
		Number    int    `json:"number"`
		Title     string `json:"title"`
		Thumbnail string `json:"thumbnail"`
		Servers   []struct {
			Name string `json:"name"`
			URL  string `json:"url"`
		} `json:"servers"`
	} `json:"episodes"`
}

func NewScraperHandler(db *gorm.DB, baseDir string) *ScraperHandler {
	return &ScraperHandler{db: db, BaseDir: baseDir}
}

type DoodstreamProxyRequest struct {
	URL string `json:"url"`
}

func (h *ScraperHandler) ProxyDoodstream(c *gin.Context) {
	var req DoodstreamProxyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if !strings.HasPrefix(req.URL, "https://doodapi.co/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Doodstream URL"})
		return
	}

	resp, err := http.Get(req.URL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to contact Doodstream"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
		return
	}

	c.Data(resp.StatusCode, "application/json", body)
}

type StreamHGProxyRequest struct {
	URL string `json:"url"`
}

func (h *ScraperHandler) ProxyStreamHG(c *gin.Context) {
	var req StreamHGProxyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if !strings.HasPrefix(req.URL, "https://streamhgapi.com/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid StreamHG URL"})
		return
	}

	resp, err := http.Get(req.URL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to contact StreamHG"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
		return
	}

	c.Data(resp.StatusCode, "application/json", body)
}

// getScriptPath returns the absolute path to a scraper script, searching in multiple project subdirectories.
func (h *ScraperHandler) getScriptPath(name string) string {
	// 1. Try flattened structure (e.g., Docker /app/scraper/ or local backend/ when BaseDir is backend)
	p1 := filepath.Join(h.BaseDir, "scraper", name)
	if _, err := os.Stat(p1); err == nil {
		return p1
	}

	// 2. Try nested structure (e.g., Local root /backend/scraper/ when BaseDir is project root)
	p2 := filepath.Join(h.BaseDir, "backend", "scraper", name)
	if _, err := os.Stat(p2); err == nil {
		return p2
	}

	// Default fallback to the expected flattened path
	return p1
}

func (h *ScraperHandler) RefreshAnime3rbVideo(c *gin.Context) {
	var body struct {
		SourceURL string `json:"source_url"`
		EpisodeID uint   `json:"episode_id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "بيانات غير صالحة"})
		return
	}
	if body.SourceURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح للحلقة"})
		return
	}

	// Use the dedicated single-episode refresh scraper (faster & more reliable than batch)
	scriptPath := h.getScriptPath("anime3rb_refresh.js")
	
	// Double check if path exists to provide a clear error message
	if _, err := os.Stat(scriptPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "ملف السكريبت غير موجود",
			"details": fmt.Sprintf("Path attempted: %s", scriptPath),
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	var stdout, stderr bytes.Buffer
	cmd := exec.CommandContext(ctx, "node", scriptPath, body.SourceURL)
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		log.Printf("[Anime3rb Refresh] Script error: %v | stderr: %s", err, stderr.String())
		// Try to parse error JSON from stdout
		var errData map[string]string
		if jsonErr := json.Unmarshal(stdout.Bytes(), &errData); jsonErr == nil && errData["error"] != "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errData["error"]})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل تشغيل سكريبت التحديث",
			"details": stderr.String(),
		})
		return
	}

	// Parse the simple { success, url } response
	var result struct {
		Success bool   `json:"success"`
		URL     string `json:"url"`
		Error   string `json:"error"`
	}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل نتيجة السكريبت", "output": stdout.String()})
		return
	}

	if !result.Success || result.URL == "" {
		errMsg := result.Error
		if errMsg == "" {
			errMsg = "لم يتم العثور على رابط مشغل. تأكد من أن source_url هو رابط حلقة anime3rb صحيح."
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
		return
	}

	// Update the stored URL in the database for this episode server
	if body.EpisodeID > 0 {
		h.db.Model(&domain.EpisodeServer{}).
			Where("episode_id = ? AND (name LIKE ? OR name LIKE ?)", body.EpisodeID, "%Anime3rb%", "%انمي العرب%").
			Update("url", result.URL)
	}

	c.JSON(http.StatusOK, gin.H{"url": result.URL})
}

func (h *ScraperHandler) TestFetchLink(c *gin.Context) {
	var body struct {
		URL         string `json:"url"`
		SeriesName  string `json:"series_name"`
		EpisodeName string `json:"episode_name"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "بيانات غير صالحة"})
		return
	}

	if body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط"})
		return
	}

	// Standard path resolution
	scraperPath := filepath.Join(h.BaseDir, "scraper", "index.js")
	log.Printf("[Scraper] Using script: %s", scraperPath)

	// Execute the node script
	const batchTimeout = 15 * 60 * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), batchTimeout)
	defer cancel()

	// Pass episode_name as the 4th argument
	cmd := exec.CommandContext(ctx, "node", scraperPath, body.URL, body.SeriesName, body.EpisodeName)
	
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		// Try to parse error from stderr if it's JSON
		var errData struct {
			Error string `json:"error"`
		}
		stdErrStr := stderr.String()
		if jsonErr := json.Unmarshal(stderr.Bytes(), &errData); jsonErr == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Scraper Error: " + errData.Error, "details": stdErrStr})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to run scraper process",
			"message": err.Error(),
			"details": stdErrStr,
			"path":    scraperPath,
		})
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

// FetchEgyDead scrapes an EgyDead episode page and returns video/download links with their embed equivalents
func (h *ScraperHandler) FetchEgyDead(c *gin.Context) {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح"})
		return
	}

	// Standard path resolution using helper
	scriptPath := h.getScriptPath("egydead_scraper.js")
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scriptPath, body.URL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		var errData map[string]string
		if jsonErr := json.Unmarshal(stdout.Bytes(), &errData); jsonErr == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errData["error"]})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل تشغيل السكريبت",
			"details": stderr.String(),
			"path":    scriptPath,
		})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل النتيجة", "output": stdout.String()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// FetchEgyDeadBatch scrapes all episodes from an EgyDead series/episode starting point
func (h *ScraperHandler) FetchEgyDeadBatch(c *gin.Context) {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح"})
		return
	}

	// Standard path resolution using helper
	scraperPath := h.getScriptPath("egydead_batch_scraper.js")

	// Batch scraping takes longer, so we increase the timeout
	ctx, cancel := context.WithTimeout(context.Background(), 15*60*time.Second) 
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scraperPath, body.URL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		var errData map[string]interface{}
		if jsonErr := json.Unmarshal(stdout.Bytes(), &errData); jsonErr == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errData["error"]})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل تشغيل سكريبت الدفعات",
			"details": stderr.String(),
			"output":  stdout.String(),
		})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل نتيجة الدفعات", "output": stdout.String()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// FetchAnime4Up scrapes an Anime4Up episode page and returns video/download links
func (h *ScraperHandler) FetchAnime4Up(c *gin.Context) {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح"})
		return
	}

	// Standard path resolution using helper
	scraperPath := h.getScriptPath("anime4up_scraper.js")

	ctx, cancel := context.WithTimeout(context.Background(), 2*60*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scraperPath, body.URL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		var errData map[string]string
		if jsonErr := json.Unmarshal(stdout.Bytes(), &errData); jsonErr == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errData["error"]})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل تشغيل السكريبت",
			"details": stderr.String(),
			"path":    scraperPath,
		})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل النتيجة", "output": stdout.String()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// FetchAnime4UpBatch scrapes all episodes from an Anime4Up series
func (h *ScraperHandler) FetchAnime4UpBatch(c *gin.Context) {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح"})
		return
	}

	// Standard path resolution using helper
	scraperPath := h.getScriptPath("anime4up_batch_scraper.js")

	ctx, cancel := context.WithTimeout(context.Background(), 15*60*time.Second) 
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scraperPath, body.URL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		var errData map[string]interface{}
		if jsonErr := json.Unmarshal(stdout.Bytes(), &errData); jsonErr == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errData["error"]})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل تشغيل سكريبت الدفعات",
			"details": stderr.String(),
			"output":  stdout.String(),
		})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل نتيجة الدفعات", "output": stdout.String()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// FetchRistoAnime scrapes a RistoAnime episode page and returns video/download links
func (h *ScraperHandler) FetchRistoAnime(c *gin.Context) {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح"})
		return
	}

	// Standard path resolution using helper
	scraperPath := h.getScriptPath("ristoanime_scraper.js")

	ctx, cancel := context.WithTimeout(context.Background(), 2*60*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scraperPath, body.URL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		var errData map[string]string
		if jsonErr := json.Unmarshal(stdout.Bytes(), &errData); jsonErr == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errData["error"]})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل تشغيل السكريبت",
			"details": stderr.String(),
			"path":    scraperPath,
		})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل النتيجة", "output": stdout.String()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// FetchRistoAnimeBatch scrapes all episodes from a RistoAnime series
func (h *ScraperHandler) FetchRistoAnimeBatch(c *gin.Context) {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح"})
		return
	}

	// Standard path resolution using helper
	scraperPath := h.getScriptPath("ristoanime_batch_scraper.js")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scraperPath, body.URL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		var errData map[string]interface{}
		if jsonErr := json.Unmarshal(stdout.Bytes(), &errData); jsonErr == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errData["error"]})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل تشغيل سكريبت الدفعات",
			"details": stderr.String(),
			"output":  stdout.String(),
		})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل نتيجة الدفعات", "output": stdout.String()})
		return
	}

	c.JSON(http.StatusOK, result)
}
// FetchWitAnimeBatch scrapes all episodes from a WitAnime series
func (h *ScraperHandler) FetchWitAnimeBatch(c *gin.Context) {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح"})
		return
	}

	// Standard path resolution using helper
	scraperPath := h.getScriptPath("witanime_batch_scraper.js")

	ctx, cancel := context.WithTimeout(context.Background(), 15*60*time.Second) 
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scraperPath, body.URL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		var errData map[string]interface{}
		if jsonErr := json.Unmarshal(stdout.Bytes(), &errData); jsonErr == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errData["error"]})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل تشغيل سكريبت الدفعات لـ WitAnime",
			"details": stderr.String(),
			"output":  stdout.String(),
		})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل نتيجة الدفعات", "output": stdout.String()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// FetchAnime3rbBatch scrapes all episodes from an Anime3rb series
func (h *ScraperHandler) FetchAnime3rbBatch(c *gin.Context) {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح"})
		return
	}

	// Standard path resolution using helper
	scraperPath := h.getScriptPath("anime3rb_batch_scraper.js")

	ctx, cancel := context.WithTimeout(context.Background(), 15*60*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scraperPath, body.URL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		var errData map[string]interface{}
		if jsonErr := json.Unmarshal(stdout.Bytes(), &errData); jsonErr == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errData["error"]})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل تشغيل سكريبت الدفعات لـ Anime3rb",
			"details": stderr.String(),
			"output":  stdout.String(),
		})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل نتيجة الدفعات", "output": stdout.String()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// FetchPageImages scrapes all images from a page with scroll support
func (h *ScraperHandler) FetchPageImages(c *gin.Context) {
	var body struct {
		URL       string `json:"url"`
		MaxImages int    `json:"max_images"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح والحد الأقصى للصور"})
		return
	}

	if body.MaxImages <= 0 {
		body.MaxImages = 100
	}

	// Standard path resolution using helper
	scraperPath := h.getScriptPath("image_scraper.js")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scraperPath, body.URL, fmt.Sprintf("%d", body.MaxImages))
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		var errData map[string]interface{}
		if jsonErr := json.Unmarshal(stdout.Bytes(), &errData); jsonErr == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errData["error"]})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل تشغيل سكريبت سحب الصور",
			"details": stderr.String(),
			"output":  stdout.String(),
		})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل النتيجة", "output": stdout.String()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// FetchAnimercoInfo fetches the base info (banner + seasons) for an Animerco anime
func (h *ScraperHandler) FetchAnimercoInfo(c *gin.Context) {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح"})
		return
	}

	scriptPath := h.getScriptPath("animerco_full_scraper.js")
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scriptPath, "base", body.URL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تشغيل السكريبت", "details": stderr.String()})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل النتيجة", "output": stdout.String()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// FetchAnimercoSeasonDetails fetches the metadata and episode thumbnails for a specific Animerco season
func (h *ScraperHandler) FetchAnimercoSeasonDetails(c *gin.Context) {
	var body struct {
		URL         string `json:"url"`
		WithServers bool   `json:"with_servers"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح"})
		return
	}

	scriptPath := h.getScriptPath("animerco_full_scraper.js")
	
	// Large timeout if fetching servers, otherwise 3 mins
	timeout := 3 * time.Minute
	if body.WithServers {
		timeout = 15 * time.Minute
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	withServersStr := "false"
	if body.WithServers {
		withServersStr = "true"
	}

	cmd := exec.CommandContext(ctx, "node", scriptPath, "season", body.URL, withServersStr)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		log.Printf("[Animerco Scraper] Error: %v | Stderr: %s", err, stderr.String())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تشغيل السكريبت", "details": stderr.String()})
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل النتيجة", "output": stdout.String()})
		return
	}

	c.JSON(http.StatusOK, result)
}
// ImportAnimercoFull handles importing an Animerco season with all its episode thumbnails
func (h *ScraperHandler) ImportAnimercoFull(c *gin.Context) {
	var body AnimercoFullImportRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "بيانات غير صالحة: " + err.Error()})
		return
	}

	// 1. Download Images
	// Image (Poster) -> The specific DVD poster for this season
	imagePath, _ := h.downloadPoster(body.Poster, body.Title)
	
	// Cover (Banner) -> The big wide banner from the anime main page
	bannerPath := imagePath // Fallback if no banner provided
	if body.AnimeBanner != "" {
		if path, err := h.downloadImage(body.AnimeBanner, body.Title+"-main-wide-banner", "animes"); err == nil {
			bannerPath = path
		}
	}

	slug := h.slugify(body.Title)
	
	anime := domain.Anime{
		Title:         body.Title,
		TitleEn:       body.Title,
		Description:   body.Story,
		DescriptionEn: body.Story,
		Slug:          slug,
		SlugEn:        slug,
		Status:        body.Status,
		Type:          body.Type,
		Category:      strings.Join(body.Genres, ","),
		Image:         imagePath,  // Season DVD Poster
		Cover:         bannerPath, // Main Anime Wide Banner
		PosterImageConfusion: imagePath, 
		BannerImageConfusion: bannerPath,
		IsPublished:   true,
		Seasons:       1,
		Rating:        8.0,
	}
	
	if err := h.db.Create(&anime).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل إنشاء الأنمي: " + err.Error()})
		return
	}

	// 2. Create Episodes
	importCount := 0
	for _, ep := range body.Episodes {
		epSlug := fmt.Sprintf("%s-%d", anime.Slug, ep.Number)
		episode := domain.Episode{
			AnimeID:       anime.ID,
			Title:         ep.Title,
			TitleEn:       ep.Title,
			Slug:          epSlug,
			SlugEn:        epSlug,
			EpisodeNumber: ep.Number,
			IsPublished:   true,
			VideoURLs:     "[]",
			Rating:        8.0,
			Banner:        bannerPath, // Using the main banner as the episode banner
		}

		// Download thumbnail
		if ep.Thumbnail != "" {
			thumbSlug := fmt.Sprintf("%s-ep-%d", body.Title, ep.Number)
			if thumbPath, err := h.downloadImage(ep.Thumbnail, thumbSlug, "episodes"); err == nil {
				episode.Thumbnail = thumbPath
			}
		} else {
			episode.Thumbnail = imagePath // Fallback to poster
		}

		if err := h.db.Create(&episode).Error; err == nil {
			importCount++
			
			// Add servers for this episode
			for _, srv := range ep.Servers {
				server := domain.EpisodeServer{
					EpisodeID: episode.ID,
					Language:  "ar",
					Name:      srv.Name,
					URL:       srv.URL,
					Type:      "embed",
				}
				h.db.Create(&server)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("تم استيراد %s مع %d حلقة وسيرفرات المشاهدة بنجاح", anime.Title, importCount),
		"anime_id": anime.ID,
	})
}

// DownloadImagesZip downloads a list of images and serves them as a ZIP file
func (h *ScraperHandler) DownloadImagesZip(c *gin.Context) {
	var body struct {
		URLs   []string `json:"urls"`
		Prefix string   `json:"prefix"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || len(body.URLs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير روابط للتحميل"})
		return
	}

	if body.Prefix == "" {
		body.Prefix = "images"
	}

	// Create a buffer to write our archive to
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)

	// Set client with timeout
	client := &http.Client{Timeout: 30 * time.Second}

	for i, imgURL := range body.URLs {
		resp, err := client.Get(imgURL)
		if err != nil {
			continue // Skip failed images
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			continue
		}

		// Get extension
		ext := ".jpg"
		if strings.Contains(imgURL, ".png") {
			ext = ".png"
		} else if strings.Contains(imgURL, ".webp") {
			ext = ".webp"
		} else if strings.Contains(imgURL, ".gif") {
			ext = ".gif"
		}

		// Create file in zip
		filename := fmt.Sprintf("%s-%d%s", body.Prefix, i+1, ext)
		f, err := zipWriter.Create(filename)
		if err != nil {
			continue
		}

		_, err = io.Copy(f, resp.Body)
		if err != nil {
			continue
		}
	}

	// Close the zip writer
	if err := zipWriter.Close(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل إنشاء ملف الضغط"})
		return
	}

	// Set headers
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.zip", body.Prefix))
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Length", fmt.Sprintf("%d", buf.Len()))
	
	// Write buffer to response
	c.Data(http.StatusOK, "application/zip", buf.Bytes())
}
// ImportScrapedAnime handles importing the scraped anime data into the database
func (h *ScraperHandler) ImportScrapedAnime(c *gin.Context) {
	var body AnimeImportRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "بيانات غير صالحة: " + err.Error()})
		return
	}

	// 1. Download Poster
	imagePath, err := h.downloadPoster(body.Poster, body.Title)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحميل الصورة: " + err.Error()})
		return
	}

	// 2. Prepare Anime Object
	slug := h.slugify(body.Title)
	anime := domain.Anime{
		Title:         body.Title,
		TitleEn:       body.Title, // Default to same as Arabic if not provided
		Description:   body.Story,
		DescriptionEn: body.Story,
		Slug:          slug,
		SlugEn:        slug,
		Status:        body.Status,
		Type:          body.Type,
		Image:         imagePath,
		Cover:         imagePath, // Use same image for cover initially
		IsPublished:   body.IsPublished,
		Seasons:       1,
		Rating:        8.0, // Default rating
	}

	// Handle Episode Count Logic
	epCount := 0
	cleanEpStr := strings.TrimSpace(body.Episodes)
	if cleanEpStr != "" && !strings.Contains(cleanEpStr, "غير معروف") {
		// Extract digits from string (e.g. "12 حلقة" -> 12)
		var digits string
		for _, r := range cleanEpStr {
			if r >= '0' && r <= '9' {
				digits += string(r)
			} else if digits != "" {
				break // Stop at first non-digit after finding some
			}
		}
		if digits != "" {
			fmt.Sscanf(digits, "%d", &epCount)
		}
	}
	
	if epCount <= 0 {
		epCount = 12 // Default fallback
	}

	// 3. Save to DB using logic similar to seeder
	if err := h.db.Where("slug = ?", anime.Slug).FirstOrCreate(&anime).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل حفظ الأنمي: " + err.Error()})
		return
	}

	// Update is_published to match user preference
	h.db.Model(&anime).Update("is_published", anime.IsPublished)

	// Create Episodes
	for i := 1; i <= epCount; i++ {
		ep := domain.Episode{
			AnimeID:       anime.ID,
			Title:         fmt.Sprintf("حلقة %d - %s", i, anime.Title),
			TitleEn:       fmt.Sprintf("Episode %d - %s", i, anime.Title),
			Slug:          fmt.Sprintf("%s-%d", anime.Slug, i),
			SlugEn:        fmt.Sprintf("%s-%d", anime.Slug, i),
			EpisodeNumber: i,
			Thumbnail:     anime.Image,
			Banner:        anime.Image,
			IsPublished:   anime.IsPublished,
			VideoURLs:     "[]",
			Rating:        8.0,
		}
		h.db.Where("slug = ?", ep.Slug).FirstOrCreate(&ep)
		h.db.Model(&ep).Update("is_published", anime.IsPublished)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "تمت إضافة الأنمي والحلقات بنجاح",
		"anime":   anime,
	})

	// 5. If AutoScrape is enabled, trigger the batch scraper in the background
	if body.AutoScrape && body.DetailURL != "" {
		go h.autoScrapeServers(anime, body.DetailURL)
	}
}

// DeepImportAnime handles synchronous deep scraping and database import in one operation.
func (h *ScraperHandler) DeepImportAnime(c *gin.Context) {
	var body AnimeImportRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "بيانات غير صالحة: " + err.Error()})
		return
	}

	if body.DetailURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يرجى تزويد رابط الأنمي (Detail URL) للسحب العميق"})
		return
	}

	// 1. Download Poster first
	imagePath, _ := h.downloadPoster(body.Poster, body.Title)
	if imagePath == "" {
		imagePath = body.Poster // Fallback to URL if download fails
	}

	// 2. Prepare Anime Object
	slug := h.slugify(body.Title)
	anime := domain.Anime{
		Title:         body.Title,
		TitleEn:       body.Title,
		Description:   body.Story,
		DescriptionEn: body.Story,
		Slug:          slug,
		SlugEn:        slug,
		Status:        body.Status,
		Type:          body.Type,
		Image:         imagePath,
		Cover:         imagePath,
		IsPublished:   body.IsPublished,
		Seasons:       1,
		Rating:        8.0,
	}

	// Use First or Create and update fields to ensure title/story are not empty
	var existingAnime domain.Anime
	err := h.db.Where("slug = ?", anime.Slug).First(&existingAnime).Error
	if err != nil {
		// Not found, create it
		if err := h.db.Create(&anime).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل حفظ الأنمي الجديد: " + err.Error()})
			return
		}
	} else {
		// Found, update missing fields if needed
		h.db.Model(&existingAnime).Updates(map[string]interface{}{
			"title":       anime.Title,
			"description": anime.Description,
			"image":       anime.Image,
			"status":      anime.Status,
		})
		anime = existingAnime
	}

	// 3. Determine scraper script
	script_name := ""
	if strings.Contains(body.DetailURL, "anime3rb.com") {
		script_name = "anime3rb_batch_scraper.js"
	} else if strings.Contains(body.DetailURL, "ristoanime.co") {
		script_name = "ristoanime_batch_scraper.js"
	} else if strings.Contains(body.DetailURL, "witanime.life") || strings.Contains(body.DetailURL, "witanime.com") {
		script_name = "witanime_batch_scraper.js"
	} else if strings.Contains(body.DetailURL, "egydead") {
		script_name = "egydead_batch_scraper.js"
	} else if strings.Contains(body.DetailURL, "animerco.org") {
		script_name = "animerco_batch_scraper.js"
	}

	if script_name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "لا يتوفر ساحب عميق لهذا الموقع حالياً"})
		return
	}
	scriptPath := h.getScriptPath(script_name)

	// 4. Run Scraper Synchronously
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Minute)
	defer cancel()

	log.Printf("[Scraper] Starting deep import for: %s using script: %s", body.DetailURL, scriptPath)
	cmd := exec.CommandContext(ctx, "node", scriptPath, body.DetailURL)
	output, err := cmd.Output()
	if err != nil {
		var stdErr string
		if exitErr, ok := err.(*exec.ExitError); ok {
			stdErr = string(exitErr.Stderr)
		}
		log.Printf("[Scraper] Deep import failed: %v, Output: %s, Stderr: %s", err, string(output), stdErr)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل السحب العميق: " + err.Error(), 
			"details": string(output) + "\n" + stdErr,
		})
		return
	}

	// 5. Parse Scraping Result
	var scResult struct {
		Success  bool `json:"success"`
		Episodes []struct {
			EpisodeNum int    `json:"episodeNum"`
			Label      string `json:"label"`
			Url        string `json:"url"`
			Title      string `json:"title"`
			Links      []struct {
				Title    string `json:"title"`
				EmbedURL string `json:"embedUrl"`
				Host     string `json:"host"`
			} `json:"links"`
		} `json:"episodes"`
	}

	if err := json.Unmarshal(output, &scResult); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل نتائج السحب: " + err.Error()})
		return
	}

	if !scResult.Success {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل السحب العميق من الموقع"})
		return
	}

	// 6. Update Anime with correct episode count if available
	actualEpCount := len(scResult.Episodes)
	if actualEpCount > 0 {
		h.db.Model(&anime).Update("episodes_count", actualEpCount)
	}

	// 7. Create/Update Episodes and Servers
	totalServers := 0
	for _, scEp := range scResult.Episodes {
		epTitle := scEp.Title
		if epTitle == "" || epTitle == "الحلقة" {
			epTitle = fmt.Sprintf("حلقة %d", scEp.EpisodeNum)
		}
		
		// Use "Anime Title - Episode Name" format as requested
		fullTitle := fmt.Sprintf("%s - %s", anime.Title, epTitle)

		ep := domain.Episode{
			AnimeID:       anime.ID,
			Title:         fullTitle,
			TitleEn:       fmt.Sprintf("%s - Episode %d", anime.Title, scEp.EpisodeNum),
			Slug:          fmt.Sprintf("%s-%d", anime.Slug, scEp.EpisodeNum),
			SlugEn:        fmt.Sprintf("%s-%d", anime.Slug, scEp.EpisodeNum),
			EpisodeNumber: scEp.EpisodeNum,
			Thumbnail:     anime.Image,
			Banner:        anime.Image,
			IsPublished:   true,
			VideoURLs:     "[]",
			Rating:        8.0,
			SourceURL:     scEp.Url,
		}
		
		// Ensure we update even if it exists to fix title/slug issues
		var existingEp domain.Episode
		if err := h.db.Where("slug = ?", ep.Slug).First(&existingEp).Error; err != nil {
			h.db.Create(&ep)
		} else {
			h.db.Model(&existingEp).Updates(map[string]interface{}{
				"title": ep.Title,
				"episode_number": ep.EpisodeNumber,
				"source_url": ep.SourceURL,
			})
			ep = existingEp
		}
		
		// Add discovered servers
		for _, link := range scEp.Links {
			server := domain.EpisodeServer{
				EpisodeID: ep.ID,
				Language:  "ar",
				Name:      link.Title,
				URL:       link.EmbedURL,
				Type:      "embed",
			}
			h.db.Where("episode_id = ? AND url = ?", server.EpisodeID, server.URL).FirstOrCreate(&server)
			totalServers++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("تم السحب العميق بنجاح! تم استيراد %d حلقة و %d رابط سيرفر.", actualEpCount, totalServers),
		"anime_id": anime.ID,
		"episodes": actualEpCount,
		"servers":  totalServers,
		"warning":  actualEpCount > 0 && totalServers == 0,
	})
}

func (h *ScraperHandler) autoScrapeServers(anime domain.Anime, detailURL string) {
	// 1. Determine script path
	// Standard path resolution using BaseDir
	scriptPath := ""
	if strings.Contains(detailURL, "anime3rb.com") {
		scriptPath = filepath.Join(h.BaseDir, "scraper", "anime3rb_batch_scraper.js")
	} else if strings.Contains(detailURL, "ristoanime.co") {
		scriptPath = filepath.Join(h.BaseDir, "scraper", "ristoanime_batch_scraper.js")
	} else if strings.Contains(detailURL, "witanime.life") || strings.Contains(detailURL, "witanime.com") {
		scriptPath = filepath.Join(h.BaseDir, "scraper", "witanime_batch_scraper.js")
	} else if strings.Contains(detailURL, "egydead") {
		scriptPath = filepath.Join(h.BaseDir, "scraper", "egydead_batch_scraper.js")
	} else if strings.Contains(detailURL, "animerco.org") {
		scriptPath = filepath.Join(h.BaseDir, "scraper", "animerco_batch_scraper.js")
	}

	if scriptPath == "" {
		fmt.Printf("No batch scraper found for URL: %s\n", detailURL)
		return
	}

	// 2. Execute Node.js script
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scriptPath, detailURL)
	output, err := cmd.Output()
	if err != nil {
		fmt.Printf("Batch scraper failed: %v\n", err)
		if exitErr, ok := err.(*exec.ExitError); ok {
			fmt.Printf("Stderr: %s\n", string(exitErr.Stderr))
		}
		return
	}

	// 3. Parse JSON output
	var result struct {
		Success  bool `json:"success"`
		Episodes []struct {
			EpisodeNum int    `json:"episodeNum"`
			Url        string `json:"url"`
			Links      []struct {
				Title    string `json:"title"`
				EmbedURL string `json:"embedUrl"`
				Host     string `json:"host"`
			} `json:"links"`
		} `json:"episodes"`
	}

	if err := json.Unmarshal(output, &result); err != nil {
		fmt.Printf("Failed to parse batch scraper output: %v\n", err)
		return
	}

	if !result.Success {
		fmt.Println("Batch scraper reported failure")
		return
	}

	// 4. Update Database
	for _, scEp := range result.Episodes {
		// Find the episode in our DB
		var dbEp domain.Episode
		err := h.db.Where("anime_id = ? AND episode_number = ?", anime.ID, scEp.EpisodeNum).First(&dbEp).Error
		if err != nil {
			fmt.Printf("Could not find episode %d in DB for anime %d\n", scEp.EpisodeNum, anime.ID)
			continue
		}

		// Add servers
		for _, link := range scEp.Links {
			server := domain.EpisodeServer{
				EpisodeID: dbEp.ID,
				Language:  "ar",
				Name:      link.Title,
				URL:       link.EmbedURL,
				Type:      "embed",
			}
			h.db.Where("episode_id = ? AND url = ?", server.EpisodeID, server.URL).FirstOrCreate(&server)
		}
		
		// Mark as published if we found links
		if len(scEp.Links) > 0 {
			updates := map[string]interface{}{
				"is_published": true,
			}
			if scEp.Url != "" {
				updates["source_url"] = scEp.Url
			}
			h.db.Model(&dbEp).Updates(updates)
		} else if scEp.Url != "" {
			h.db.Model(&dbEp).Update("source_url", scEp.Url)
		}
	}

	fmt.Printf("Automated server scraping completed for anime: %s\n", anime.Title)
}

func (h *ScraperHandler) downloadPoster(url, title string) (string, error) {
	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("bad status: %s", resp.Status)
	}

	// Create filename
	ext := ".jpg"
	if strings.Contains(url, ".png") {
		ext = ".png"
	} else if strings.Contains(url, ".webp") {
		ext = ".webp"
	}
	
	filename := h.slugify(title) + ext
	
	// The physical directory inside the project root
	// The user specifically wants it inside backend/uploads/animes
	physicalDir := filepath.Join("backend", "uploads", "animes")
	
	// Ensure directory exists using absolute path
	absDir := filepath.Join(h.BaseDir, physicalDir)
	if err := os.MkdirAll(absDir, os.ModePerm); err != nil {
		return "", fmt.Errorf("failed to create directory: %v", err)
	}

	absFilePath := filepath.Join(absDir, filename)
	out, err := os.Create(absFilePath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return "", err
	}

	// Return the relative URL path for the database.
	// Since main.go serves absPath("backend", "uploads") as "/uploads",
	// the URL for this file should be "/uploads/animes/filename"
	return "/uploads/animes/" + filename, nil
}

func (h *ScraperHandler) slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	// Simple cleanup: remove unsafe chars
	reg := strings.NewReplacer("!", "", "?", "", "(", "", ")", "", ":", "", ",", "")
	return reg.Replace(s)
}

func (h *ScraperHandler) FetchAnimercoBatch(c *gin.Context) {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON غير صالح"})
		return
	}
	if body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح لموقع Animerco"})
		return
	}

	scriptPath := h.getScriptPath("animerco_batch_scraper.js")
	if _, err := os.Stat(scriptPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ملف السكريبت غير موجود"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scriptPath, body.URL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل تنفيذ عملية السحب",
			"details": stderr.String(),
		})
		return
	}

	var result interface{}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل معالجة نتائج السحب"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *ScraperHandler) DeepImportCrunchyroll(c *gin.Context) {
	var body struct {
		URL         string `json:"url"`
		PreviewOnly bool   `json:"preview_only"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب تقديم رابط صالح"})
		return
	}

	scriptPath := h.getScriptPath("crunchyroll_batch_scraper.js")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scriptPath, body.URL)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "فشل تشغيل سكريبت Crunchyroll",
			"details": stderr.String(),
		})
		return
	}

	// Parse the flexible result
	var rawResult map[string]interface{}
	if err := json.Unmarshal(stdout.Bytes(), &rawResult); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل نتائج السكريبت", "details": err.Error(), "raw": stdout.String()})
		return
	}

	// If discovery mode — return as-is to the frontend
	isDiscovery, _ := rawResult["isDiscovery"].(bool)
	if isDiscovery {
		c.JSON(http.StatusOK, rawResult)
		return
	}

	// If preview only — return scraped data without saving
	if body.PreviewOnly {
		c.JSON(http.StatusOK, rawResult)
		return
	}

	// ----- FULL DEEP IMPORT -----
	type EpData struct {
		Title         string `json:"title"`
		TitleEn       string `json:"titleEn"`
		Number        int    `json:"number"`
		Thumbnail     string `json:"thumbnail"`
		Link          string `json:"link"`
		Slug          string `json:"slug"`
		SlugEn        string `json:"slugEn"`
		Description   string `json:"description"`
		DescriptionEn string `json:"descriptionEn"`
	}
	type AnimeResult struct {
		IsDiscovery   bool     `json:"isDiscovery"`
		Title         string   `json:"title"`
		Description   string   `json:"description"`
		DescriptionEn string   `json:"descriptionEn"`
		Poster        string   `json:"poster"`
		Banner        string   `json:"banner"`
		Genres        []string `json:"genres"`
		Episodes      []EpData `json:"episodes"`
	}

	var result AnimeResult
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل بيانات الأنمي"})
		return
	}

	if result.Title == "" || result.Title == "N/A" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "لم يتم العثور على عنوان الأنمي. قد يكون الرابط غير صحيح."})
		return
	}

	// Build anime record
	anime := domain.Anime{
		Title:         result.Title,
		Description:   result.Description,
		DescriptionEn: result.DescriptionEn,
		Status:        "Ongoing",
		Type:          "TV",
	}

	// Download Poster
	if result.Poster != "" {
		if path, err := h.downloadImage(result.Poster, result.Title, "animes"); err == nil {
			anime.Image = path
		}
	}
	// Download Banner/Cover
	if result.Banner != "" {
		if path, err := h.downloadImage(result.Banner, result.Title+"-cover", "animes"); err == nil {
			anime.Cover = path
		}
	}

	// Save or find existing anime
	if err := h.db.Where("title = ?", anime.Title).FirstOrCreate(&anime).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل حفظ الأنمي في قاعدة البيانات"})
		return
	}

	// Update images and descriptions if not set on existing record
	updates := map[string]interface{}{}
	if anime.Image != "" {
		updates["image"] = anime.Image
	}
	if anime.Cover != "" {
		updates["cover"] = anime.Cover
	}
	if anime.Description != "" {
		updates["description"] = anime.Description
	}
	if anime.DescriptionEn != "" {
		updates["description_en"] = anime.DescriptionEn
	}
	if len(updates) > 0 {
		h.db.Model(&anime).Updates(updates)
	}

	// Import Episodes
	importCount := 0
	for _, ep := range result.Episodes {
		// Build slug from link if not provided
		slug := ep.Slug
		if slug == "" && ep.Link != "" {
			parts := strings.Split(ep.Link, "/")
			slug = parts[len(parts)-1]
		}
		slugEn := ep.SlugEn
		if slugEn == "" {
			slugEn = slug
		}

		episode := domain.Episode{
			AnimeID:       anime.ID,
			Title:         ep.Title,
			TitleEn:       ep.TitleEn,
			Slug:          slug,
			SlugEn:        slugEn,
			Description:   ep.Description,
			DescriptionEn: ep.DescriptionEn,
			EpisodeNumber: ep.Number,
			SourceURL:     ep.Link,
			IsPublished:   true,
		}

		// Download episode thumbnail
		if ep.Thumbnail != "" {
			epSlug := fmt.Sprintf("%s-ep-%d", result.Title, ep.Number)
			if thumbPath, err := h.downloadImage(ep.Thumbnail, epSlug, "episodes"); err == nil {
				episode.Thumbnail = thumbPath
			}
		}

		// Create episode if not exists, otherwise update missing fields
		var existing domain.Episode
		res := h.db.Where("anime_id = ? AND episode_number = ?", anime.ID, ep.Number).First(&existing)
		if res.Error != nil {
			// Not found – create
			h.db.Create(&episode)
		} else {
			// Update missing fields
			epUpdates := map[string]interface{}{}
			if existing.Thumbnail == "" && episode.Thumbnail != "" {
				epUpdates["thumbnail"] = episode.Thumbnail
			}
			if existing.TitleEn == "" && episode.TitleEn != "" {
				epUpdates["title_en"] = episode.TitleEn
			}
			if existing.DescriptionEn == "" && episode.DescriptionEn != "" {
				epUpdates["description_en"] = episode.DescriptionEn
			}
			if existing.Slug == "" && episode.Slug != "" {
				epUpdates["slug"] = episode.Slug
			}
			if existing.SlugEn == "" && episode.SlugEn != "" {
				epUpdates["slug_en"] = episode.SlugEn
			}
			if len(epUpdates) > 0 {
				h.db.Model(&existing).Updates(epUpdates)
			}
		}
		importCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      fmt.Sprintf("تم استيراد '%s' بنجاح", anime.Title),
		"anime_id":     anime.ID,
		"import_count": importCount,
		"title":        anime.Title,
		"poster":       anime.Image,
		"cover":        anime.Cover,
	})
}

// UpdateAnimeFromCrunchyroll updates an existing anime in the DB with fresh Crunchyroll data.
// Preserves: poster image (image field), all EpisodeServer records.
// Updates: description, banner/cover image, episode titles, episode thumbnails, episode source_url.
// Adds: new episodes if Crunchyroll count > DB count.
func (h *ScraperHandler) UpdateAnimeFromCrunchyroll(c *gin.Context) {
	var body struct {
		AnimeID     uint   `json:"anime_id"`
		Description string `json:"description"`
		Banner      string `json:"banner"`
		Episodes    []struct {
			Number    int    `json:"number"`
			Title     string `json:"title"`
			Thumbnail string `json:"thumbnail"`
			Link      string `json:"link"`
		} `json:"episodes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.AnimeID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب تقديم anime_id صالح"})
		return
	}

	// 1. Fetch existing anime
	var anime domain.Anime
	if err := h.db.First(&anime, body.AnimeID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "الأنمي غير موجود في قاعدة البيانات"})
		return
	}

	// 2. Update description + banner/cover — poster image (image field) stays unchanged
	animeUpdates := map[string]interface{}{}
	if body.Description != "" {
		animeUpdates["description"] = body.Description
		animeUpdates["description_en"] = body.Description
	}
	// Download and update banner (cover) if provided
	if body.Banner != "" {
		bannerSlug := fmt.Sprintf("%s-banner-cr", anime.Title)
		if coverPath, err := h.downloadImage(body.Banner, bannerSlug, "animes"); err == nil {
			animeUpdates["cover"] = coverPath
		} else {
			// Fallback: store URL directly if download fails
			animeUpdates["cover"] = body.Banner
		}
	}
	if len(animeUpdates) > 0 {
		h.db.Model(&anime).Updates(animeUpdates)
	}

	// 3. Process episodes
	updatedCount := 0
	addedCount := 0
	for _, epData := range body.Episodes {
		// Download new thumbnail (fall back to URL if download fails)
		thumbPath := epData.Thumbnail
		if epData.Thumbnail != "" {
			epSlug := fmt.Sprintf("%s-ep-%d-cr", anime.Title, epData.Number)
			if path, err := h.downloadImage(epData.Thumbnail, epSlug, "episodes"); err == nil {
				thumbPath = path
			}
		}

		// Find existing episode by anime_id + episode_number
		var existing domain.Episode
		res := h.db.Where("anime_id = ? AND episode_number = ?", anime.ID, epData.Number).First(&existing)

		if res.Error != nil {
			// Episode doesn't exist → create new
			slug := fmt.Sprintf("%s-%d", anime.Slug, epData.Number)
			newEp := domain.Episode{
				AnimeID:       anime.ID,
				Title:         epData.Title,
				TitleEn:       epData.Title,
				Slug:          slug,
				SlugEn:        slug,
				EpisodeNumber: epData.Number,
				Thumbnail:     thumbPath,
				Banner:        thumbPath,
				SourceURL:     epData.Link,
				IsPublished:   true,
				VideoURLs:     "[]",
				Rating:        8.0,
			}
			h.db.Create(&newEp)
			addedCount++
		} else {
			// Episode exists → update title + thumbnail + source_url
			// Servers (EpisodeServer) are NOT touched
			epUpdates := map[string]interface{}{
				"source_url": epData.Link,
			}
			if epData.Title != "" {
				epUpdates["title"] = epData.Title
				epUpdates["title_en"] = epData.Title
			}
			if thumbPath != "" {
				epUpdates["thumbnail"] = thumbPath
				epUpdates["banner"] = thumbPath
			}
			h.db.Model(&existing).Updates(epUpdates)
			updatedCount++
		}
	}

	// 4. Update episodes_count if Crunchyroll has more
	if len(body.Episodes) > 0 {
		h.db.Model(&anime).Update("episodes_count", len(body.Episodes))
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"message":       fmt.Sprintf("تم تحديث '%s' بنجاح", anime.Title),
		"anime_id":      anime.ID,
		"title":         anime.Title,
		"updated_count": updatedCount,
		"added_count":   addedCount,
	})
}

// downloadImage is a helper to download remote images to a subDirectory in uploads
func (h *ScraperHandler) downloadImage(imgUrl, title, subDir string) (string, error) {
	// Parse URL to handle complex ones
	_, err := url.ParseRequestURI(imgUrl)
	if err != nil {
		return "", err
	}

	resp, err := http.Get(imgUrl)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("bad status code: %d", resp.StatusCode)
	}

	// Detect image extension from URL first, then from Content-Type
	ext := ".jpg"
	lowerUrl := strings.ToLower(imgUrl)
	if strings.Contains(lowerUrl, ".png") {
		ext = ".png"
	} else if strings.Contains(lowerUrl, ".webp") {
		ext = ".webp"
	} else if strings.Contains(lowerUrl, ".gif") {
		ext = ".gif"
	} else {
		// Fallback: check Content-Type header
		ct := resp.Header.Get("Content-Type")
		if strings.Contains(ct, "png") {
			ext = ".png"
		} else if strings.Contains(ct, "webp") {
			ext = ".webp"
		} else if strings.Contains(ct, "gif") {
			ext = ".gif"
		}
	}

	filename := h.slugify(title) + ext
	physicalDir := filepath.Join("backend", "uploads", subDir)
	absDir := filepath.Join(h.BaseDir, physicalDir)
	
	if err := os.MkdirAll(absDir, os.ModePerm); err != nil {
		return "", err
	}

	absFilePath := filepath.Join(absDir, filename)
	out, err := os.Create(absFilePath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("/uploads/%s/%s", subDir, filename), nil
}
