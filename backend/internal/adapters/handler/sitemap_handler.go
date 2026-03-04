package handler

import (
	"backend/internal/core/domain"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SitemapHandler struct {
	db *gorm.DB
}

func NewSitemapHandler(db *gorm.DB) *SitemapHandler {
	return &SitemapHandler{db: db}
}

// Sitemap XML structure
const (
	header = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`
	footer = `
</urlset>`
)

func (h *SitemapHandler) GetSitemap(c *gin.Context) {
	var animes []domain.Anime
	var episodes []domain.Episode

	// Fetch all active animes with minimal fields
	if err := h.db.Select("id", "slug", "slug_en", "updated_at").Where("is_active = ?", true).Find(&animes).Error; err != nil {
		c.String(http.StatusInternalServerError, "Error fetching animes")
		return
	}

	// Fetch all published episodes with minimal fields
	if err := h.db.Select("id", "anime_id", "episode_number", "updated_at").Find(&episodes).Error; err != nil {
		c.String(http.StatusInternalServerError, "Error fetching episodes")
		return
	}

	// Helper map for finding anime slug by ID quickly
	animeSlugMap := make(map[uint]string)
	for _, a := range animes {
		// Prefer English slug for URL consistency, or fallback to standard slug
		slug := a.SlugEn
		if slug == "" {
			slug = a.Slug
		}
		// Fallback to ID if no slug (shouldn't happen ideally)
		if slug == "" {
			slug = fmt.Sprintf("%d", a.ID)
		}
		animeSlugMap[a.ID] = slug
	}

	// Determine Base URL dynamically
	scheme := "https"
	if c.Request.TLS == nil && (c.Request.Host == "localhost:8080" || c.Request.Host == "localhost:5173") {
		scheme = "http"
	}
	baseURL := fmt.Sprintf("%s://%s", scheme, c.Request.Host)

	c.Writer.Header().Set("Content-Type", "application/xml")
	c.String(http.StatusOK, header)

	// Static Pages
	// Home (Arabic and English)
	h.addURL(c, baseURL+"/ar", time.Now(), "daily", "1.0")
	h.addURL(c, baseURL+"/en", time.Now(), "daily", "1.0")

	// Browse Pages
	h.addURL(c, baseURL+"/ar/animes", time.Now(), "daily", "0.9")
	h.addURL(c, baseURL+"/en/animes", time.Now(), "daily", "0.9")

	// Anime Pages
	for _, anime := range animes {
		// Arabic URL
		slugAr := anime.Slug
		if slugAr == "" {
			slugAr = fmt.Sprintf("%d", anime.ID)
		}
		h.addURL(c, fmt.Sprintf("%s/ar/animes/%s", baseURL, slugAr), anime.UpdatedAt, "weekly", "0.8")

		// English URL
		slugEn := anime.SlugEn
		if slugEn == "" {
			slugEn = slugAr
		} // Fallback
		h.addURL(c, fmt.Sprintf("%s/en/animes/%s", baseURL, slugEn), anime.UpdatedAt, "weekly", "0.8")
	}

	// Episode Pages
	for _, ep := range episodes {
		animeSlug, exists := animeSlugMap[ep.AnimeID]
		if !exists {
			continue
		}

		// We use the anime slug for the watch URL as per the new routing: /watch/:slug/:episodeNum
		// Arabic
		h.addURL(c, fmt.Sprintf("%s/ar/watch/%s/%d", baseURL, animeSlug, ep.EpisodeNumber), ep.UpdatedAt, "monthly", "0.6")

		// English
		h.addURL(c, fmt.Sprintf("%s/en/watch/%s/%d", baseURL, animeSlug, ep.EpisodeNumber), ep.UpdatedAt, "monthly", "0.6")
	}

	c.String(http.StatusOK, footer)
}

func (h *SitemapHandler) addURL(c *gin.Context, loc string, lastmod time.Time, changefreq string, priority string) {
	c.String(http.StatusOK, fmt.Sprintf(`
	<url>
		<loc>%s</loc>
		<lastmod>%s</lastmod>
		<changefreq>%s</changefreq>
		<priority>%s</priority>
	</url>`, loc, lastmod.Format("2006-01-02"), changefreq, priority))
}
