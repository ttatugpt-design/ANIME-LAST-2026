package handler

import (
	"backend/internal/core/domain"
	"backend/internal/core/service"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type AnimeHandler struct {
	service *service.AnimeService
}

func NewAnimeHandler(service *service.AnimeService) *AnimeHandler {
	return &AnimeHandler{service: service}
}

// sanitizeAnime removes the hardcoded localhost:8080 prefix from image URLs
// This fixes Mixed Content errors when serving over HTTPS
func (h *AnimeHandler) sanitizeAnime(a *domain.Anime) {
	if a == nil {
		return
	}
	a.Image = strings.ReplaceAll(a.Image, "http://localhost:8080", "")
	a.Cover = strings.ReplaceAll(a.Cover, "http://localhost:8080", "")
	a.IconImage = strings.ReplaceAll(a.IconImage, "http://localhost:8080", "")
	a.PosterImageConfusion = strings.ReplaceAll(a.PosterImageConfusion, "http://localhost:8080", "")
	a.BannerImageConfusion = strings.ReplaceAll(a.BannerImageConfusion, "http://localhost:8080", "")

	// Also sanitize relative paths if they don't start with / but should (optional safeguard)
	if !strings.HasPrefix(a.Image, "http") && !strings.HasPrefix(a.Image, "/") && a.Image != "" {
		a.Image = "/" + a.Image
	}
	if !strings.HasPrefix(a.Cover, "http") && !strings.HasPrefix(a.Cover, "/") && a.Cover != "" {
		a.Cover = "/" + a.Cover
	}
	if !strings.HasPrefix(a.IconImage, "http") && !strings.HasPrefix(a.IconImage, "/") && a.IconImage != "" {
		a.IconImage = "/" + a.IconImage
	}
	if !strings.HasPrefix(a.PosterImageConfusion, "http") && !strings.HasPrefix(a.PosterImageConfusion, "/") && a.PosterImageConfusion != "" {
		a.PosterImageConfusion = "/" + a.PosterImageConfusion
	}
	if !strings.HasPrefix(a.BannerImageConfusion, "http") && !strings.HasPrefix(a.BannerImageConfusion, "/") && a.BannerImageConfusion != "" {
		a.BannerImageConfusion = "/" + a.BannerImageConfusion
	}
}

func (h *AnimeHandler) deleteFile(path string) {
	if path == "" || strings.HasPrefix(path, "http") {
		return
	}
	relPath := strings.TrimPrefix(path, "/")
	os.Remove(relPath)
	// Try deleting confusion if exists (safeguard)
	ext := filepath.Ext(relPath)
	if ext != "" {
		confusionPath := strings.TrimSuffix(relPath, ext) + "_confusion" + ext
		os.Remove(confusionPath)
	}
}

// extractRelativePath extracts the path starting from /uploads/
func (h *AnimeHandler) extractRelativePath(path string) string {
	// Normalize to forward slashes for consistent searching
	normalized := filepath.ToSlash(path)
	if idx := strings.Index(normalized, "/uploads/"); idx != -1 {
		return normalized[idx:]
	}
	// Attempt to find uploads directory even if not prefixed with slash
	if idx := strings.Index(normalized, "uploads/"); idx != -1 {
		return "/" + normalized[idx:]
	}
	return path
}

func (h *AnimeHandler) Create(c *gin.Context) {
	var anime domain.Anime
	if err := c.ShouldBindJSON(&anime); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	createdAnime, err := h.service.Create(&anime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.sanitizeAnime(createdAnime)
	c.JSON(http.StatusCreated, createdAnime)
}

func (h *AnimeHandler) GetAll(c *gin.Context) {
	categoryID, _ := strconv.Atoi(c.Query("category_id"))
	letter := c.Query("letter")
	search := c.Query("search")
	animeType := c.Query("type")
	order := c.Query("order")

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	animes, err := h.service.GetAll(uint(categoryID), letter, search, animeType, order, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range animes {
		h.sanitizeAnime(&animes[i])
	}

	// If pagination is requested explicitly, return metadata
	if c.Query("paginate") == "true" {
		total, _ := h.service.Count(uint(categoryID), letter, search, animeType)
		c.JSON(http.StatusOK, gin.H{
			"data":      animes,
			"total":     total,
			"page":      page,
			"limit":     limit,
			"last_page": (total + int64(limit) - 1) / int64(limit),
		})
		return
	}

	c.JSON(http.StatusOK, animes)
}

func (h *AnimeHandler) GetByID(c *gin.Context) {
	idParam := c.Param("id")
	var anime *domain.Anime
	var err error

	if id, errConv := strconv.Atoi(idParam); errConv == nil {
		anime, err = h.service.GetByID(uint(id))
	} else {
		// If not numeric, try looking by slug for compatibility
		anime, err = h.service.GetBySlug(idParam)
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Anime not found"})
		return
	}
	h.sanitizeAnime(anime)
	c.JSON(http.StatusOK, anime)
}

func (h *AnimeHandler) GetBySlug(c *gin.Context) {
	slugParam := c.Param("slug")
	var anime *domain.Anime
	var err error

	if id, errConv := strconv.Atoi(slugParam); errConv == nil {
		anime, err = h.service.GetByID(uint(id))
	} else {
		anime, err = h.service.GetBySlug(slugParam)
	}

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Anime not found"})
		return
	}
	h.sanitizeAnime(anime)
	c.JSON(http.StatusOK, anime)
}

func (h *AnimeHandler) Update(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var anime domain.Anime
	if err := c.ShouldBindJSON(&anime); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	anime.ID = uint(id)

	// Fetch existing to handle file deletion
	existing, err := h.service.GetByID(uint(id))
	if err == nil {
		// Detect changes and delete old files (original + confusion)
		if anime.Image != "" && anime.Image != existing.Image {
			h.deleteFile(existing.Image)
		}
		if anime.Cover != "" && anime.Cover != existing.Cover {
			h.deleteFile(existing.Cover)
		}
		if anime.IconImage != "" && anime.IconImage != existing.IconImage {
			h.deleteFile(existing.IconImage)
		}
	}

	cascadeStr := c.DefaultQuery("cascade", "true")
	cascadeEpisodes := cascadeStr == "true"

	updatedAnime, err := h.service.Update(&anime, cascadeEpisodes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.sanitizeAnime(updatedAnime)
	c.JSON(http.StatusOK, updatedAnime)
}

func (h *AnimeHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	// Delete files before deleting record
	existing, err := h.service.GetByID(uint(id))
	if err == nil {
		h.deleteFile(existing.Image)
		h.deleteFile(existing.Cover)
		h.deleteFile(existing.IconImage)
	}

	if err := h.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Anime deleted"})
}

func (h *AnimeHandler) GetLatest(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	animes, err := h.service.GetLatest(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range animes {
		h.sanitizeAnime(&animes[i])
	}
	c.JSON(http.StatusOK, animes)
}

func (h *AnimeHandler) GetByType(c *gin.Context) {
	animeType := c.Param("type")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "0"))
	animes, err := h.service.GetByType(animeType, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range animes {
		h.sanitizeAnime(&animes[i])
	}
	c.JSON(http.StatusOK, animes)
}

func (h *AnimeHandler) Search(c *gin.Context) {
	query := c.Query("search")
	if query == "" {
		c.JSON(http.StatusOK, []domain.Anime{})
		return
	}

	animes, err := h.service.Search(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range animes {
		h.sanitizeAnime(&animes[i])
	}
	c.JSON(http.StatusOK, animes)
}
