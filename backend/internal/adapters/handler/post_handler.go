package handler

import (
	"backend/internal/adapters/ws"
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type PostHandler struct {
	postService port.PostService
	userRepo    port.UserRepository
	notifRepo   port.NotificationRepository
	hub         *ws.Hub
}

func NewPostHandler(postService port.PostService, userRepo port.UserRepository, notifRepo port.NotificationRepository, hub *ws.Hub) *PostHandler {
	return &PostHandler{
		postService: postService,
		userRepo:    userRepo,
		notifRepo:   notifRepo,
		hub:         hub,
	}
}

// GetFeed gets the paginated list of posts for the community page
func (h *PostHandler) GetFeed(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit > 50 {
		limit = 50
	}
	offset := (page - 1) * limit

	posts, err := h.postService.GetFeedPaginated(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch feed"})
		return
	}

	// Format response to include helpful boolean for current user
	userIDValue, exists := c.Get("user_id")
	var currentUserID uint
	if exists {
		currentUserID, _ = userIDValue.(uint)
	}

	for i := range posts {
		// Assuming we will need to augment with user_interaction logic later
		// For now, returning the raw posts works if default includes like counts
		h.formatPostResponse(&posts[i], currentUserID)
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     posts,
		"page":     page,
		"limit":    limit,
		"has_more": len(posts) == limit,
	})
}

// CreatePost handles multipart form data for text and images
func (h *PostHandler) CreatePost(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	content := c.PostForm("content")

	// Handle multiple images
	form, _ := c.MultipartForm()

	var imageUrls []string

	if form != nil {
		files := form.File["images[]"]
		for _, file := range files {
			// Basic validation
			ext := strings.ToLower(filepath.Ext(file.Filename))
			if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
				continue
			}

			// Save file directly
			filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), file.Filename)
			path := filepath.Join("uploads", "posts", filename)

			// Ensure dir exists
			os.MkdirAll(filepath.Join("uploads", "posts"), os.ModePerm)

			if err := c.SaveUploadedFile(file, path); err == nil {
				// Convert to web-friendly path
				webPath := strings.ReplaceAll(path, "\\", "/")
				imageUrls = append(imageUrls, "/"+webPath)
			}
		}
	}

	post, err := h.postService.CreatePost(userID, content, imageUrls)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, post)
}

func (h *PostHandler) DeletePost(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
		return
	}

	if err := h.postService.DeletePost(userID, uint(postID)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Post deleted successfully"})
}

func (h *PostHandler) TogglePostLike(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
		return
	}

	liked, err := h.postService.TogglePostLike(userID, uint(postID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle like"})
		return
	}

	// NOTIFICATION LOGIC: Post Like
	if liked {
		// Fetch post to get owner
		post, err := h.postService.GetPostByID(uint(postID))
		if err == nil && post.UserID != userID {
			// Fetch actor profile for rich notification data
			actor, _ := h.userRepo.GetUserByID(userID)
			actorName := "User"
			actorAvatar := ""
			if actor != nil {
				actorName = actor.Name
				actorAvatar = actor.Avatar
			}

			dataPayload := gin.H{
				"post_id":      post.ID,
				"actor_id":     userID,
				"actor_name":   actorName,
				"actor_avatar": actorAvatar,
				"content":      post.Content,
			}
			dataJSON, _ := json.Marshal(dataPayload)

			notif := &domain.Notification{
				UserID: post.UserID,
				Type:   domain.NotificationTypeLike, // Reuse "like" type
				Data:   dataJSON,
			}
			h.notifRepo.Create(notif)

			// Broadcast via WebSocket
			h.hub.SendToUser(post.UserID, gin.H{
				"type": "notification",
				"data": notif,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"liked": liked})
}

// --- Comments ---

func (h *PostHandler) GetPostComments(c *gin.Context) {
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	comments, err := h.postService.GetCommentsByPostIDPaginated(uint(postID), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     comments,
		"page":     page,
		"has_more": len(comments) == limit,
	})
}

func (h *PostHandler) CreatePostComment(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
		return
	}

	var req struct {
		Content  string `json:"content" binding:"required"`
		ParentID *uint  `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	comment, err := h.postService.CreateComment(userID, uint(postID), req.ParentID, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, comment)
}

func (h *PostHandler) DeletePostComment(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	commentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	if err := h.postService.DeleteComment(userID, uint(commentID)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted successfully"})
}

func (h *PostHandler) ToggleCommentLike(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	commentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	var req struct {
		IsLike bool `json:"is_like"` // Should map to true/false from client
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	err = h.postService.ToggleCommentLike(userID, uint(commentID), req.IsLike)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle interaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Interaction updated"})
}

func (h *PostHandler) GetPostCommentReplies(c *gin.Context) {
	parentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))
	offset := (page - 1) * limit

	replies, err := h.postService.GetRepliesByCommentIDPaginated(uint(parentID), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch replies"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":     replies,
		"page":     page,
		"has_more": len(replies) == limit,
	})
}

// Helper
func (h *PostHandler) formatPostResponse(post *domain.Post, currentUserID uint) {
	// Preload like status
	if currentUserID > 0 {
		var like domain.PostLike
		err := h.postService.GetPostLikeStatus(currentUserID, post.ID, &like)
		if err == nil {
			isLiked := true
			post.UserInteraction = &isLiked
		}
	}
}

func (h *PostHandler) checkPostLikeStatus(postID, userID uint) bool {
	// Re-checking via repository logic if service has a helper
	// Assuming s.repo.GetPostLike exists
	return false
}
