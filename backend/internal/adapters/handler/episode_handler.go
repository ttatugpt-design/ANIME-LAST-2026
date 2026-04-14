package handler

import (
	"backend/internal/adapters/repository"
	"backend/internal/core/domain"
	"backend/internal/core/service"
	"log"
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
	// Filter parameters
	animeID, _ := strconv.Atoi(c.Query("anime_id"))
	categoryID, _ := strconv.Atoi(c.Query("category_id"))
	episodeNum, _ := strconv.Atoi(c.Query("episode_number"))
	letter := c.Query("letter")
	search := c.Query("search")
	animeType := c.Query("type")
	order := c.Query("order")

	// Pagination
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "25"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	offset := 0
	if limit > 0 {
		offset = (page - 1) * limit
	}

	// If a specific episode number is requested for a specific anime
	if animeID > 0 && episodeNum > 0 {
		ep, err := h.service.GetByAnimeAndNumber(uint(animeID), episodeNum)
		if err == nil && ep != nil {
			h.sanitizeEpisode(ep)
			c.JSON(http.StatusOK, []domain.Episode{*ep})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Episode not found"})
		return
	}

	// Fetch episodes for general pagination
	episodes, err := h.service.GetAll(uint(animeID), uint(categoryID), letter, search, animeType, order, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for i := range episodes {
		h.sanitizeEpisode(&episodes[i])
	}

	// If pagination is requested explicitly, return metadata
	if c.Query("paginate") == "true" {
		total, _ := h.service.Count(uint(animeID), uint(categoryID), letter, search, animeType)
		c.JSON(http.StatusOK, gin.H{
			"data":      episodes,
			"total":     total,
			"page":      page,
			"limit":     limit,
			"last_page": (total + int64(limit) - 1) / int64(limit),
		})
		return
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
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	offset, _ := strconv.Atoi(c.Query("offset"))

	// if offset is not provided but page is, calculate offset
	if offset == 0 && page > 1 {
		offset = (page - 1) * limit
	}

	episodes, err := h.service.GetLatest(limit, offset)
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
		Type string `json:"type"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Type == "" {
		input.Type = "like"
	}

	if err := h.likeRepo.ToggleLike(userID, uint(id), input.Type); err != nil {
		log.Printf("[ToggleReaction ERROR] userID=%d episodeID=%d type=%s err=%v", userID, id, input.Type, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Fetch updated episode stats
	episode, err := h.service.GetByID(uint(id))
	if err != nil {
		log.Printf("[ToggleReaction GetByID ERROR] episodeID=%d err=%v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get user's current reaction
	reaction, _ := h.likeRepo.GetUserReaction(userID, uint(id))
	var userReaction *string
	if reaction != nil {
		userReaction = &reaction.Type
	}

	c.JSON(http.StatusOK, gin.H{
		"likes_count":      episode.LikesCount,
		"loves_count":      episode.LovesCount,
		"hahas_count":      episode.HahasCount,
		"wows_count":       episode.WowsCount,
		"sads_count":       episode.SadsCount,
		"angrys_count":     episode.AngrysCount,
		"super_sads_count": episode.SuperSadsCount,
		"dislikes_count":   episode.DislikesCount,
		"user_reaction":    userReaction,
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
		log.Printf("[GetStats ERROR] episodeID=%d err=%v", id, err)
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	var userReaction *string
	if userID > 0 {
		reaction, _ := h.likeRepo.GetUserReaction(userID, uint(id))
		if reaction != nil {
			userReaction = &reaction.Type
		}
	}

	var commentsCount int64
	if id > 0 {
		commentsCount, _ = h.commentRepo.CountByEpisodeID(uint(id))
	}

	c.JSON(http.StatusOK, gin.H{
		"views_count":      episode.ViewsCount,
		"likes_count":      episode.LikesCount,
		"loves_count":      episode.LovesCount,
		"hahas_count":      episode.HahasCount,
		"wows_count":       episode.WowsCount,
		"sads_count":       episode.SadsCount,
		"angrys_count":     episode.AngrysCount,
		"super_sads_count": episode.SuperSadsCount,
		"dislikes_count":   episode.DislikesCount,
		"comments_count":   commentsCount,
		"user_reaction":    userReaction,
	})
}
