package handler

import (
	"backend/internal/adapters/repository"
	"backend/internal/core/domain"
	"backend/internal/core/service"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type EpisodeHandler struct {
	service     *service.EpisodeService
	repo        *repository.SQLiteRepository
	likeRepo    *repository.EpisodeLikeRepository
	commentRepo *repository.CommentRepository
}

func NewEpisodeHandler(service *service.EpisodeService, repo *repository.SQLiteRepository, likeRepo *repository.EpisodeLikeRepository, commentRepo *repository.CommentRepository) *EpisodeHandler {
	return &EpisodeHandler{
		service:     service,
		repo:        repo,
		likeRepo:    likeRepo,
		commentRepo: commentRepo,
	}
}

// sanitizeEpisode removes the hardcoded localhost:8080 prefix from image URLs
func (h *EpisodeHandler) sanitizeEpisode(e *domain.Episode) {
	if e == nil {
		return
	}
	e.Thumbnail = strings.ReplaceAll(e.Thumbnail, "http://localhost:8080", "")
	e.Banner = strings.ReplaceAll(e.Banner, "http://localhost:8080", "")
	// Also sanitize relative paths if they don't start with / but should
	if !strings.HasPrefix(e.Thumbnail, "http") && !strings.HasPrefix(e.Thumbnail, "/") && e.Thumbnail != "" {
		e.Thumbnail = "/" + e.Thumbnail
	}
	if !strings.HasPrefix(e.Banner, "http") && !strings.HasPrefix(e.Banner, "/") && e.Banner != "" {
		e.Banner = "/" + e.Banner
	}
	// Note: VideoURLs are JSON strings or external links, usually better left alone or parsed carefully if needed.
	// Assuming VideoURLs are usually external embeds or handled separately.
}

func (h *EpisodeHandler) Create(c *gin.Context) {
	var episode domain.Episode
	if err := c.ShouldBindJSON(&episode); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.service.Create(&episode); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.sanitizeEpisode(&episode)
	c.JSON(http.StatusCreated, episode)
}

func (h *EpisodeHandler) GetAll(c *gin.Context) {
	// Support filtering by anime_id and episode_number via query params
	animeIDStr := c.Query("anime_id")
	episodeNumStr := c.Query("episode_number")

	// If anime_id is provided, filter by it
	if animeIDStr != "" {
		animeID, err := strconv.Atoi(animeIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid anime_id"})
			return
		}

		episodes, err := h.service.GetByAnimeID(uint(animeID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// If episode_number is also provided, filter further
		if episodeNumStr != "" {
			episodeNum, err := strconv.Atoi(episodeNumStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode_number"})
				return
			}

			// Find the specific episode
			for _, ep := range episodes {
				if ep.EpisodeNumber == episodeNum {
					h.sanitizeEpisode(&ep)
					c.JSON(http.StatusOK, []domain.Episode{ep})
					return
				}
			}
			c.JSON(http.StatusNotFound, gin.H{"error": "Episode not found"})
			return
		}

		for i := range episodes {
			h.sanitizeEpisode(&episodes[i])
		}
		c.JSON(http.StatusOK, episodes)
		return
	}

	// NEW: Support filtering by category, letter, type and order when not filtering by specific anime
	categoryID, _ := strconv.Atoi(c.Query("category_id"))
	letter := c.Query("letter")
	animeType := c.Query("type")
	order := c.Query("order")

	// No specific anime filter, use general GetAll with filters
	episodes, err := h.service.GetAll(uint(categoryID), letter, animeType, order)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range episodes {
		h.sanitizeEpisode(&episodes[i])
	}
	c.JSON(http.StatusOK, episodes)
}

func (h *EpisodeHandler) GetByID(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	episode, err := h.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Episode not found"})
		return
	}
	h.sanitizeEpisode(episode)
	c.JSON(http.StatusOK, episode)
}

func (h *EpisodeHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode ID"})
		return
	}
	var episode domain.Episode
	if err := c.ShouldBindJSON(&episode); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	episode.ID = uint(id)
	if err := h.service.Update(&episode); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.sanitizeEpisode(&episode)
	c.JSON(http.StatusOK, episode)
}

func (h *EpisodeHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Episode deleted"})
}

func (h *EpisodeHandler) GetLatest(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	episodes, err := h.service.GetLatest(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range episodes {
		h.sanitizeEpisode(&episodes[i])
	}
	c.JSON(http.StatusOK, episodes)
}

func (h *EpisodeHandler) Search(c *gin.Context) {
	query := c.Query("search")
	if query == "" {
		c.JSON(http.StatusOK, []domain.Episode{})
		return
	}

	episodes, err := h.service.Search(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range episodes {
		h.sanitizeEpisode(&episodes[i])
	}
	c.JSON(http.StatusOK, episodes)
}

// TrackView increments the view count for an episode
func (h *EpisodeHandler) TrackView(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode ID"})
		return
	}

	if err := h.repo.IncrementEpisodeViews(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to track view"})
		return
	}

	// Fetch updated episode to return new count
	episode, err := h.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"views_count": 0})
		return
	}

	c.JSON(http.StatusOK, gin.H{"views_count": episode.ViewsCount})
}

// ToggleReaction handles like/dislike toggling
func (h *EpisodeHandler) ToggleReaction(c *gin.Context) {
	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode ID"})
		return
	}

	var input struct {
		IsLike bool `json:"is_like"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.likeRepo.ToggleLike(userID, uint(id), input.IsLike); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle reaction"})
		return
	}

	// Fetch updated episode stats
	episode, err := h.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stats"})
		return
	}

	// Get user's current reaction
	reaction, _ := h.likeRepo.GetUserReaction(userID, uint(id))
	var userReaction *string
	if reaction != nil {
		if reaction.IsLike {
			val := "like"
			userReaction = &val
		} else {
			val := "dislike"
			userReaction = &val
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"likes_count":    episode.LikesCount,
		"dislikes_count": episode.DislikesCount,
		"user_reaction":  userReaction,
	})
}

// GetStats returns episode statistics including user's reaction
func (h *EpisodeHandler) GetStats(c *gin.Context) {
	userID := c.GetUint("user_id")

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode ID"})
		return
	}

	episode, err := h.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Episode not found"})
		return
	}

	var userReaction *string
	if userID > 0 {
		reaction, _ := h.likeRepo.GetUserReaction(userID, uint(id))
		if reaction != nil {
			if reaction.IsLike {
				val := "like"
				userReaction = &val
			} else {
				val := "dislike"
				userReaction = &val
			}
		}
	}

	var commentsCount int64
	if id > 0 {
		commentsCount, _ = h.commentRepo.CountByEpisodeID(uint(id))
	}

	c.JSON(http.StatusOK, gin.H{
		"views_count":    episode.ViewsCount,
		"likes_count":    episode.LikesCount,
		"dislikes_count": episode.DislikesCount,
		"comments_count": commentsCount,
		"user_reaction":  userReaction,
	})
}
