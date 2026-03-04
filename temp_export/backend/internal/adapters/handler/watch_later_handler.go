package handler

import (
	"backend/internal/core/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type WatchLaterHandler struct {
	service *service.WatchLaterService
}

func NewWatchLaterHandler(s *service.WatchLaterService) *WatchLaterHandler {
	return &WatchLaterHandler{service: s}
}

// Toggle handles adding/removing item from watch later
// POST /api/watch-later
func (h *WatchLaterHandler) Toggle(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var req struct {
		AnimeID   *uint `json:"anime_id"`
		EpisodeID *uint `json:"episode_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.AnimeID == nil && req.EpisodeID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "anime_id or episode_id is required"})
		return
	}

	added, err := h.service.Toggle(userID, req.AnimeID, req.EpisodeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	msg := "removed from watch later"
	if added {
		msg = "added to watch later"
	}
	c.JSON(http.StatusOK, gin.H{"message": msg, "added": added})
}

// GetByUser returns all watch later items for the user
// GET /api/watch-later
func (h *WatchLaterHandler) GetByUser(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	items, err := h.service.GetByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, items)
}

// CheckStatus checks if an item is in watch later
// GET /api/watch-later/check
func (h *WatchLaterHandler) CheckStatus(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	animeIDStr := c.Query("anime_id")
	episodeIDStr := c.Query("episode_id")

	var animeID *uint
	var episodeID *uint

	if animeIDStr != "" {
		id, _ := strconv.ParseUint(animeIDStr, 10, 64)
		uid := uint(id)
		animeID = &uid
	}
	if episodeIDStr != "" {
		id, _ := strconv.ParseUint(episodeIDStr, 10, 64)
		uid := uint(id)
		episodeID = &uid
	}

	if animeID == nil && episodeID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "anime_id or episode_id is required"})
		return
	}

	exists, err := h.service.IsSaved(userID, animeID, episodeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"saved": exists})
}
