package handler

import (
	"backend/internal/adapters/repository"
	"backend/internal/adapters/ws"
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"backend/internal/core/service"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// escapeJSON escapes special characters for JSON strings
func escapeJSON(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `"`, `\"`)
	s = strings.ReplaceAll(s, "\n", `\n`)
	s = strings.ReplaceAll(s, "\r", `\r`)
	s = strings.ReplaceAll(s, "\t", `\t`)
	return s
}

type CommentHandler struct {
	repo           *repository.CommentRepository
	notifRepo      *repository.NotificationRepository
	userRepo       port.UserRepository
	historyService *service.HistoryService
	hub            *ws.Hub
}

func NewCommentHandler(repo *repository.CommentRepository, notifRepo *repository.NotificationRepository, userRepo port.UserRepository, historyService *service.HistoryService, hub *ws.Hub) *CommentHandler {
	return &CommentHandler{
		repo:           repo,
		notifRepo:      notifRepo,
		userRepo:       userRepo,
		historyService: historyService,
		hub:            hub,
	}
}

// Create handles creating a new comment
func (h *CommentHandler) Create(c *gin.Context) {
	var input struct {
		Content   string `json:"content" binding:"required"`
		EpisodeID uint   `json:"episode_id"` // Optional if passing via param
		ParentID  *uint  `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// If episode ID is in param, override
	episodeIDParam := c.Param("id")
	if episodeIDParam != "" {
		id, _ := strconv.Atoi(episodeIDParam)
		input.EpisodeID = uint(id)
	}

	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Missing valid user session"})
		return
	}

	comment := domain.Comment{
		Content:   input.Content,
		EpisodeID: input.EpisodeID,
		UserID:    userID,
		ParentID:  input.ParentID,
	}

	if err := h.repo.Create(&comment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create comment"})
		return
	}

	// Fetch full comment with preloaded User to avoid "Unknown User" on frontend
	if fullComment, err := h.repo.GetByID(comment.ID); err == nil {
		comment = *fullComment
	}

	// NOTIFICATION LOGIC: Reply
	if comment.ParentID != nil {
		// Fetch parent to get owner
		parent, err := h.repo.GetByID(*comment.ParentID)
		if err == nil && parent.UserID != userID {
			// Create notification
			// Create rich notification data
			animeTitle := parent.Episode.Anime.Title
			animeImage := parent.Episode.Anime.Image
			epNum := parent.Episode.EpisodeNumber

			dataPayload := gin.H{
				"comment_id":      comment.ID,
				"parent_id":       parent.ID,
				"actor_id":        userID,
				"actor_name":      comment.User.Name,
				"actor_avatar":    comment.User.Avatar,
				"comment_content": parent.Content,
				"reply_content":   comment.Content,
				"anime_id":        parent.Episode.AnimeID,
				"anime_title":     animeTitle,
				"anime_image":     animeImage,
				"episode_id":      parent.EpisodeID,
				"episode_number":  epNum,
				"episode_image":   parent.Episode.Thumbnail,
			}
			dataJSON, _ := json.Marshal(dataPayload)

			notif := &domain.Notification{
				UserID: parent.UserID,
				Type:   domain.NotificationTypeReply,
				Data:   dataJSON,
			}
			h.notifRepo.Create(notif)

			// Broadcast via WebSocket
			h.hub.SendToUser(parent.UserID, gin.H{
				"type": "notification",
				"data": notif,
			})
		}

		// Track Reply with metadata
		repliedToUser := "User"
		if parent != nil && parent.User != nil {
			repliedToUser = parent.User.Name
		}
		metadata := `{"content": "` + escapeJSON(comment.Content) + `", "replied_to_user": "` + escapeJSON(repliedToUser) + `", "episode_id": ` + strconv.Itoa(int(comment.EpisodeID)) + `}`
		go h.historyService.TrackWithMetadata(userID, domain.ActivityReply, &comment.EpisodeID, nil, &comment.ID, metadata, "")
	} else {
		// Track Comment with metadata
		metadata := `{"content": "` + escapeJSON(comment.Content) + `", "episode_id": ` + strconv.Itoa(int(comment.EpisodeID)) + `}`
		go h.historyService.TrackWithMetadata(userID, domain.ActivityComment, &comment.EpisodeID, nil, &comment.ID, metadata, "")
	}

	// Broadcast to episode topic for real-time updates
	topic := "episode:" + strconv.Itoa(int(comment.EpisodeID))
	h.hub.BroadcastToTopic(topic, gin.H{
		"type": "comment",
		"data": comment,
	})

	c.JSON(http.StatusCreated, comment)
}

// GetAllByEpisode fetches comments for an episode
func (h *CommentHandler) GetAllByEpisode(c *gin.Context) {
	episodeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode ID"})
		return
	}

	comments, err := h.repo.GetByEpisodeID(uint(episodeID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}

	c.JSON(http.StatusOK, comments)
}

// ToggleLike
func (h *CommentHandler) ToggleLike(c *gin.Context) {
	commentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	var input struct {
		IsLike bool `json:"is_like"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("user_id")

	if err := h.repo.ToggleLike(uint(userID), uint(commentID), input.IsLike); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle like"})
		return
	}

	// NOTIFICATION LOGIC: Like
	if input.IsLike {
		// Fetch comment to get owner and context
		target, err := h.repo.GetByID(uint(commentID))
		if err == nil {
			if target.UserID != userID {
				// Fetch actor profile for rich notification data
				actor, _ := h.userRepo.GetUserByID(userID)
				actorName := "User"
				actorAvatar := ""
				if actor != nil {
					actorName = actor.Name
					actorAvatar = actor.Avatar
				}

				dataPayload := gin.H{
					"comment_id":      target.ID,
					"parent_id":       target.ParentID,
					"actor_id":        userID,
					"actor_name":      actorName,
					"actor_avatar":    actorAvatar,
					"comment_content": target.Content,
					"anime_id":        target.Episode.AnimeID,
					"anime_title":     target.Episode.Anime.Title,
					"anime_image":     target.Episode.Anime.Image,
					"episode_id":      target.EpisodeID,
					"episode_number":  target.Episode.EpisodeNumber,
					"episode_image":   target.Episode.Thumbnail,
				}

				dataJSON, _ := json.Marshal(dataPayload)

				notif := &domain.Notification{
					UserID: target.UserID,
					Type:   domain.NotificationTypeLike,
					Data:   dataJSON,
				}
				h.notifRepo.Create(notif)

				// Broadcast via WebSocket (Direct notification)
				h.hub.SendToUser(target.UserID, gin.H{
					"type": "notification",
					"data": notif,
				})
			}

			// Broadcast like update to episode topic (For real-time count updates for everyone)
			topic := "episode:" + strconv.Itoa(int(target.EpisodeID))
			h.hub.BroadcastToTopic(topic, gin.H{
				"type": "comment_like",
				"data": gin.H{
					"comment_id": commentID,
					"is_like":    input.IsLike,
					"user_id":    userID,
				},
			})

			// Track Like in History with metadata
			commentIDUint := uint(commentID)
			ownerName := "User"
			if target.User != nil {
				ownerName = target.User.Name
			}
			metadata := `{"comment_content": "` + escapeJSON(target.Content) + `", "comment_owner": "` + escapeJSON(ownerName) + `", "episode_id": ` + strconv.Itoa(int(target.EpisodeID)) + `}`
			go h.historyService.TrackWithMetadata(userID, domain.ActivityLike, &target.EpisodeID, nil, &commentIDUint, metadata, "")
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

// Delete
func (h *CommentHandler) Delete(c *gin.Context) {
	commentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	// Verify ownership?
	// For MVP, just delete. Middleware checks generic auth.
	// Ideally check if userID == comment.UserID or Role == Admin.
	// Assume Repo handles it or we do a GetByID check here.

	userID := c.GetUint("user_id")
	role := c.GetString("role") // Assumes AuthMiddleware sets "role"

	// Simple ownership check
	existing, err := h.repo.GetByID(uint(commentID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
		return
	}

	// Allow if owner OR admin
	if existing.UserID != userID && role != "admin" && role != "super_admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
		return
	}

	if err := h.repo.Delete(uint(commentID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comment"})
		return
	}

	// Cleanup notifications in background
	go func() {
		h.notifRepo.DeleteByCommentID(uint(commentID))
		h.notifRepo.DeleteByParentID(uint(commentID))
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

// GetAllComments for dashboard
func (h *CommentHandler) GetAllComments(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "0"))
	comments, err := h.repo.GetAllComments(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}
	c.JSON(http.StatusOK, comments)
}

// Update
func (h *CommentHandler) Update(c *gin.Context) {
	commentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	var input struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("user_id")
	existing, err := h.repo.GetByID(uint(commentID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
		return
	}

	if existing.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
		return
	}

	existing.Content = input.Content
	if err := h.repo.Update(existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update comment"})
		return
	}

	// Sync notifications in background
	go func() {
		h.notifRepo.UpdateContentByCommentID(existing.ID, existing.Content)
		h.notifRepo.UpdateContentByParentID(existing.ID, existing.Content)
	}()

	c.JSON(http.StatusOK, existing)
}
