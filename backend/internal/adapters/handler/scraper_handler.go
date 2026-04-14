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

func NewScraperHandler(db *gorm.DB, baseDir string) *ScraperHandler {
	return &ScraperHandler{db: db, BaseDir: baseDir}
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح"})
		return
	}

	// The system will now always fetch, as requested by the user, regardless of last update time.

	// Standard path resolution using BaseDir
	scriptPath := filepath.Join(h.BaseDir, "scraper", "anime3rb_batch_scraper.js")
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "node", scriptPath, body.SourceURL)
	output, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل السحب: " + err.Error()})
		return
	}

	// Parse output
	var result struct {
		Success  bool `json:"success"`
		Episodes []struct {
			Links []struct {
				Title    string `json:"title"`
				EmbedURL string `json:"embedUrl"`
			} `json:"links"`
		} `json:"episodes"`
	}
	if err := json.Unmarshal(output, &result); err != nil || !result.Success || len(result.Episodes) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل تحليل المحتوى"})
		return
	}

	// Find first valid embedUrl
	var newURL string
	for _, l := range result.Episodes[0].Links {
		if l.EmbedURL != "" {
			newURL = l.EmbedURL
			break
		}
	}

	if newURL == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "لم يتم العثور على رابط مشغل"})
		return
	}

	// Update in database for this specific episode server if id is provided
	if body.EpisodeID > 0 {
		h.db.Model(&domain.EpisodeServer{}).
			Where("episode_id = ? AND (name LIKE ? OR name LIKE ?)", body.EpisodeID, "%Anime3rb%", "%انمي العرب%").
			Update("url", newURL)
	}

	c.JSON(http.StatusOK, gin.H{"url": newURL})
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

	// Standard path resolution
	scraperPath := filepath.Join(h.BaseDir, "scraper", "egydead_scraper.js")

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

// FetchEgyDeadBatch scrapes all episodes from an EgyDead series/episode starting point
func (h *ScraperHandler) FetchEgyDeadBatch(c *gin.Context) {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح"})
		return
	}

	// Standard path resolution
	scraperPath := filepath.Join(h.BaseDir, "scraper", "egydead_batch_scraper.js")

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

	// Standard path resolution
	scraperPath := filepath.Join(h.BaseDir, "scraper", "anime4up_scraper.js")

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

	// Standard path resolution
	scraperPath := filepath.Join(h.BaseDir, "scraper", "anime4up_batch_scraper.js")

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

	// Standard path resolution
	scraperPath := filepath.Join(h.BaseDir, "scraper", "ristoanime_scraper.js")

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

	// Standard path resolution
	scraperPath := filepath.Join(h.BaseDir, "scraper", "ristoanime_batch_scraper.js")

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
// FetchWitAnimeBatch scrapes all episodes from a WitAnime series
func (h *ScraperHandler) FetchWitAnimeBatch(c *gin.Context) {
	var body struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "يجب توفير رابط صالح"})
		return
	}

	// Standard path resolution
	scraperPath := filepath.Join(h.BaseDir, "scraper", "witanime_batch_scraper.js")

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

	// Standard path resolution
	scraperPath := filepath.Join(h.BaseDir, "scraper", "anime3rb_batch_scraper.js")

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
		body.MaxImages = 50
	}

	// Standard path resolution
	scraperPath := filepath.Join(h.BaseDir, "scraper", "image_scraper.js")

	ctx, cancel := context.WithTimeout(context.Background(), 5*60*time.Second) 
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
	// Standard path resolution using BaseDir
	scriptPath := ""
	if strings.Contains(body.DetailURL, "anime3rb.com") {
		scriptPath = filepath.Join(h.BaseDir, "scraper", "anime3rb_batch_scraper.js")
	} else if strings.Contains(body.DetailURL, "ristoanime.co") {
		scriptPath = filepath.Join(h.BaseDir, "scraper", "ristoanime_batch_scraper.js")
	} else if strings.Contains(body.DetailURL, "witanime.life") || strings.Contains(body.DetailURL, "witanime.com") {
		scriptPath = filepath.Join(h.BaseDir, "scraper", "witanime_batch_scraper.js")
	} else if strings.Contains(body.DetailURL, "egydead") {
		scriptPath = filepath.Join(h.BaseDir, "scraper", "egydead_batch_scraper.js")
	}

	if scriptPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "لا يتوفر ساحب عميق لهذا الموقع حالياً"})
		return
	}

	// 4. Run Scraper Synchronously
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Minute)
	defer cancel()

	log.Printf("[Scraper] Starting deep import for: %s using script: %s", body.DetailURL, scriptPath)
	cmd := exec.CommandContext(ctx, "node", scriptPath, body.DetailURL)
	output, err := cmd.Output() // Use Output() ONLY for stdout (JSON), combined output breaks JSON parsing
	if err != nil {
		log.Printf("[Scraper] Deep import failed: %v, Output: %s", err, string(output))
		// If there's an error, combined output might be more useful for the details field
		combined, _ := cmd.CombinedOutput()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "فشل السحب العميق: " + err.Error(), "details": string(combined)})
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
	relPath := filepath.Join("uploads", "animes", filename)
	
	// Ensure directory exists using absolute path
	absPath := filepath.Join(h.BaseDir, relPath)
	os.MkdirAll(filepath.Dir(absPath), os.ModePerm)

	out, err := os.Create(absPath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return "", err
	}

	return "/" + strings.ReplaceAll(relPath, "\\", "/"), nil
}

func (h *ScraperHandler) slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	// Simple cleanup: remove unsafe chars
	reg := strings.NewReplacer("!", "", "?", "", "(", "", ")", "", ":", "", ",", "")
	return reg.Replace(s)
}
