package handler

import (
	"backend/internal/core/domain"
	"backend/internal/core/service"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type HistoryHandler struct {
	service *service.HistoryService
}

func NewHistoryHandler(service *service.HistoryService) *HistoryHandler {
	return &HistoryHandler{service: service}
}

func (h *HistoryHandler) GetHistory(c *gin.Context) {
	userID := c.GetUint("user_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	histories, err := h.service.GetHistory(userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, histories)
}

func (h *HistoryHandler) TrackEpisodeView(c *gin.Context) {
	var input struct {
		EpisodeID uint   `json:"episode_id" binding:"required"`
		AnimeID   uint   `json:"anime_id" binding:"required"`
		Image     string `json:"image"` // Optional: frontend can send image path
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// DEBUG LOGGING
	fmt.Printf("\n=== TRACK EPISODE DEBUG ===\n")
	fmt.Printf("Received EpisodeID: %d\n", input.EpisodeID)
	fmt.Printf("Received AnimeID: %d\n", input.AnimeID)
	fmt.Printf("Received Image: %s\n", input.Image)
	fmt.Printf("========================\n\n")

	userID := c.GetUint("user_id")
	if err := h.service.Track(userID, domain.ActivityEpisodeView, &input.EpisodeID, &input.AnimeID, nil, input.Image); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Episode view tracked"})
}

func (h *HistoryHandler) TrackAnimeView(c *gin.Context) {
	var input struct {
		AnimeID uint   `json:"anime_id" binding:"required"`
		Image   string `json:"image"` // Optional: frontend can send image path
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("user_id")
	if err := h.service.Track(userID, domain.ActivityAnimeView, nil, &input.AnimeID, nil, input.Image); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Anime view tracked"})
}

func (h *HistoryHandler) ClearHistory(c *gin.Context) {
	userID := c.GetUint("user_id")

	if err := h.service.ClearHistory(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "History cleared"})
}
