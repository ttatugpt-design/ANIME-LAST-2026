package handler

import (
	"net/http"

	"backend/internal/adapters/repository"
	// "backend/internal/core/domain" // Not needed unless we use domain types directly here

	"github.com/gin-gonic/gin"
)

type AnalyticsHandler struct {
	repo *repository.SQLiteRepository
}

func NewAnalyticsHandler(repo *repository.SQLiteRepository) *AnalyticsHandler {
	return &AnalyticsHandler{repo: repo}
}

func (h *AnalyticsHandler) GetGlobalStats(c *gin.Context) {
	// We need: Total Views (sum of episode views), Total Reports, Total Users, etc.
	// Since I don't have direct access to all these counts via simple methods,
	// I might need to add a method to SQLiteRepository or just execute raw SQL here or via repo.
	// Best practice: Add method to repository.

	stats, err := h.repo.GetGlobalStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch global stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *AnalyticsHandler) GetTopContent(c *gin.Context) {
	topAnimes, err := h.repo.GetTopAnimes(c.Request.Context(), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch top animes"})
		return
	}

	topEpisodes, err := h.repo.GetTopEpisodes(c.Request.Context(), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch top episodes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"top_animes":   topAnimes,
		"top_episodes": topEpisodes,
	})
}
