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

// GetPostByIDHandler fetches a single post by its ID
func (h *PostHandler) GetPostByIDHandler(c *gin.Context) {
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
		return
	}

	post, err := h.postService.GetPostByID(uint(postID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}

	// Format response to include is_liked for current user
	userIDValue, exists := c.Get("user_id")
	if exists {
		if currentUserID, ok := userIDValue.(uint); ok {
			h.formatPostResponse(post, currentUserID)
		}
	}

	c.JSON(http.StatusOK, post)
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

// CreatePost handles multipart form data for text, images, and videos
func (h *PostHandler) CreatePost(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	content := c.PostForm("content")

	// Handle multiple media files
	form, _ := c.MultipartForm()
	var media []domain.PostMedia

	if form != nil {
		files := form.File["media[]"] // Changed from "images[]" to "media[]"
		if len(files) == 0 {
			// Backwards compatibility for now if needed, but "media[]" is preferred
			files = form.File["images[]"]
		}

		for _, file := range files {
			ext := strings.ToLower(filepath.Ext(file.Filename))
			mediaType := "image"
			isImage := ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp"
			isVideo := ext == ".mp4" || ext == ".mov" || ext == ".avi" || ext == ".webm" || ext == ".mkv"

			if !isImage && !isVideo {
				continue
			}
			if isVideo {
				mediaType = "video"
			}

			// Save file
			filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), file.Filename)
			dir := filepath.Join("uploads", "posts")
			os.MkdirAll(dir, os.ModePerm)
			path := filepath.Join(dir, filename)

			if err := c.SaveUploadedFile(file, path); err == nil {
				webPath := "/" + strings.ReplaceAll(path, "\\", "/")
				media = append(media, domain.PostMedia{
					MediaType: mediaType,
					MediaURL:  webPath,
				})
			}
		}
	}

	post, err := h.postService.CreatePost(userID, content, media)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.formatPostResponse(post, userID)
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

func (h *PostHandler) UpdatePost(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
		return
	}

	content := c.PostForm("content")
	mediaToKeepStr := c.PostForm("media_to_keep") // Expect JSON array string like "[1,2,3]"
	var mediaToKeep []uint
	if mediaToKeepStr != "" {
		json.Unmarshal([]byte(mediaToKeepStr), &mediaToKeep)
	}

	// Handle new media uploads
	form, _ := c.MultipartForm()
	var newMedia []domain.PostMedia
	if form != nil {
		files := form.File["media[]"]
		for _, file := range files {
			ext := strings.ToLower(filepath.Ext(file.Filename))
			mediaType := "image"
			isImage := ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp"
			isVideo := ext == ".mp4" || ext == ".mov" || ext == ".avi" || ext == ".webm" || ext == ".mkv"

			if !isImage && !isVideo {
				continue
			}
			if isVideo {
				mediaType = "video"
			}

			filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), file.Filename)
			dir := filepath.Join("uploads", "posts")
			os.MkdirAll(dir, os.ModePerm)
			path := filepath.Join(dir, filename)

			if err := c.SaveUploadedFile(file, path); err == nil {
				webPath := "/" + strings.ReplaceAll(path, "\\", "/")
				newMedia = append(newMedia, domain.PostMedia{
					MediaType: mediaType,
					MediaURL:  webPath,
				})
			}
		}
	}

	post, err := h.postService.UpdatePost(userID, uint(postID), content, mediaToKeep, newMedia)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	h.formatPostResponse(post, userID)
	c.JSON(http.StatusOK, post)
}

func (h *PostHandler) TogglePostLike(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
		return
	}

	var req struct {
		Type string `json:"type" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reaction type is required"})
		return
	}

	result, err := h.postService.TogglePostLike(userID, uint(postID), req.Type)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle like"})
		return
	}

	// NOTIFICATION LOGIC: Post Like
	if result == "added" || result == "changed" {
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

			postMediaURL := ""
			if len(post.Media) > 0 {
				postMediaURL = post.Media[0].MediaURL
			}

			dataPayload := gin.H{
				"post_id":        post.ID,
				"actor_id":       userID,
				"actor_name":     actorName,
				"actor_avatar":   actorAvatar,
				"content":        post.Content,
				"post_media_url": postMediaURL,
				"reaction_type":  req.Type,
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

	c.JSON(http.StatusOK, gin.H{"result": result, "type": req.Type})
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

	// Attach user's reaction type to each comment and its children
	userIDValue, exists := c.Get("user_id")
	if exists {
		currentUserID, _ := userIDValue.(uint)
		if currentUserID > 0 {
			for i := range comments {
				reactionType := h.postService.GetPostCommentLikeStatus(currentUserID, comments[i].ID)
				if reactionType != "" {
					comments[i].UserReaction = &reactionType
				}
				for j := range comments[i].Children {
					rt := h.postService.GetPostCommentLikeStatus(currentUserID, comments[i].Children[j].ID)
					if rt != "" {
						comments[i].Children[j].UserReaction = &rt
					}
				}
			}
		}
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
		Content       string `json:"content" binding:"required"`
		ParentID      *uint  `json:"parent_id"`
		MentionUserID *uint  `json:"mention_user_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	comment, err := h.postService.CreateComment(userID, uint(postID), req.ParentID, req.MentionUserID, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Fetch full comment with preloaded User to ensure avatar is sent
	if fullComment, err := h.postService.GetCommentByID(comment.ID); err == nil {
		comment = fullComment
	}

	// NOTIFICATION LOGIC
	if comment.ParentID != nil {
		parent, err := h.postService.GetCommentByID(*comment.ParentID)
		if err == nil {
			// Rich metadata for notifications
			postOwner, _ := h.postService.GetPostByID(uint(postID))

			actorName := "User"
			actorAvatar := ""
			if comment.User != nil {
				actorName = comment.User.Name
				actorAvatar = comment.User.Avatar
			}

			postMediaURL := ""
			if postOwner != nil && len(postOwner.Media) > 0 {
				postMediaURL = postOwner.Media[0].MediaURL
			}

			dataPayload := gin.H{
				"comment_id":      comment.ID,
				"parent_id":       parent.ID,
				"actor_id":        userID,
				"actor_name":      actorName,
				"actor_avatar":    actorAvatar,
				"comment_content": parent.Content,
				"reply_content":   comment.Content,
				"post_id":         postID,
				"post_media_url":  postMediaURL,
				"is_reply_to_reply": parent.ParentID != nil && *parent.ParentID != 0,
			}
			if parent.Parent != nil && parent.Parent.User != nil {
				dataPayload["parent_target_name"] = parent.Parent.User.Name
			}
			if postOwner != nil {
				dataPayload["post_content"] = postOwner.Content
			}
			dataJSON, _ := json.Marshal(dataPayload)

			parentOwnerNotified := false

			// 1. Notify Mentioned User (if different from current user)
			if comment.MentionUserID != nil && *comment.MentionUserID != userID {
				// Use the specific reply from the mentioned user as the context if found
				mentionDataJSON := dataJSON
				if mentionedUserReply, err := h.postService.GetMostRecentCommentByUserAndParent(*comment.MentionUserID, parent.ID); err == nil && mentionedUserReply != nil {
					// Create a specialized payload for the mentioned user
					mentionDataPayload := make(gin.H)
					for k, v := range dataPayload { mentionDataPayload[k] = v }
					mentionDataPayload["comment_content"] = mentionedUserReply.Content
					mentionDataPayload["is_reply_to_reply"] = true
					mentionDataJSON, _ = json.Marshal(mentionDataPayload)
				}

				notif := &domain.Notification{
					UserID: *comment.MentionUserID,
					Type:   domain.NotificationTypeReply,
					Data:   mentionDataJSON,
				}
				h.notifRepo.Create(notif)
				h.hub.SendToUser(*comment.MentionUserID, gin.H{"type": "notification", "data": notif})

				if *comment.MentionUserID == parent.UserID {
					parentOwnerNotified = true
				}
			}

			// 2. Notify Parent Owner (if not the same user, and hasn't just been notified as a Mentioned User)
			if parent.UserID != userID && !parentOwnerNotified {
				notif := &domain.Notification{
					UserID: parent.UserID,
					Type:   domain.NotificationTypeReply,
					Data:   dataJSON,
				}
				h.notifRepo.Create(notif)
				h.hub.SendToUser(parent.UserID, gin.H{"type": "notification", "data": notif})
			}
		}
	} else {
		// It is a root comment on the post
		postOwner, err := h.postService.GetPostByID(uint(postID))
		if err == nil && postOwner != nil && postOwner.UserID != userID {
			actorName := "User"
			actorAvatar := ""
			if comment.User != nil {
				actorName = comment.User.Name
				actorAvatar = comment.User.Avatar
			}

			postMediaURL := ""
			if postOwner != nil && len(postOwner.Media) > 0 {
				postMediaURL = postOwner.Media[0].MediaURL
			}

			dataPayload := gin.H{
				"comment_id":      comment.ID,
				"actor_id":        userID,
				"actor_name":      actorName,
				"actor_avatar":    actorAvatar,
				"comment_content": comment.Content,
				"post_id":         postID,
				"post_content":    postOwner.Content,
				"post_media_url":  postMediaURL,
			}
			dataJSON, _ := json.Marshal(dataPayload)

			notif := &domain.Notification{
				UserID: postOwner.UserID,
				Type:   domain.NotificationTypeComment,
				Data:   dataJSON,
			}
			h.notifRepo.Create(notif)
			h.hub.SendToUser(postOwner.UserID, gin.H{"type": "notification", "data": notif})
		}
	}

	// Broadcast to post topic for real-time updates
	topic := "post:" + c.Param("id")
	h.hub.BroadcastToTopic(topic, gin.H{
		"type": "comment",
		"data": comment,
	})

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

func (h *PostHandler) UpdatePostComment(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	commentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	comment, err := h.postService.UpdateComment(userID, uint(commentID), req.Content)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, comment)
}

func (h *PostHandler) ToggleCommentLike(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	commentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	var req struct {
		Type string `json:"type" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reaction type is required"})
		return
	}

	err = h.postService.ToggleCommentLike(userID, uint(commentID), req.Type)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle interaction"})
		return
	}

	target, fetchErr := h.postService.GetCommentByID(uint(commentID))
	if fetchErr == nil {
		// NOTIFICATION LOGIC: Post Comment Like
		if target.UserID != userID { // Removed req.IsLike check, now we notify on any reaction (or we could limit it if we want)
			actor, _ := h.userRepo.GetUserByID(userID)
			actorName := "User"
			actorAvatar := ""
			if actor != nil {
				actorName = actor.Name
				actorAvatar = actor.Avatar
			}

			postOwner, _ := h.postService.GetPostByID(target.PostID)
			postMediaURL := ""
			if postOwner != nil && len(postOwner.Media) > 0 {
				postMediaURL = postOwner.Media[0].MediaURL
			}

			dataPayload := gin.H{
				"comment_id":      target.ID,
				"parent_id":       target.ParentID,
				"actor_id":        userID,
				"actor_name":      actorName,
				"actor_avatar":    actorAvatar,
				"comment_content": target.Content,
				"post_id":         target.PostID,
				"post_media_url":  postMediaURL,
				"reaction_type":   req.Type,
			}
			dataJSON, _ := json.Marshal(dataPayload)

			notif := &domain.Notification{
				UserID: target.UserID,
				Type:   domain.NotificationTypeLike,
				Data:   dataJSON,
			}
			h.notifRepo.Create(notif)
			h.hub.SendToUser(target.UserID, gin.H{"type": "notification", "data": notif})
		}

		// Broadcast like update to post topic (For real-time count updates)
		topic := "post:" + strconv.Itoa(int(target.PostID))
		h.hub.BroadcastToTopic(topic, gin.H{
			"type": "comment_like",
			"data": gin.H{
				"comment_id": commentID,
				"type":       req.Type,
				"user_id":    userID,
			},
		})
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

	// Attach user's reaction type to each reply
	userIDValue, exists := c.Get("user_id")
	if exists {
		currentUserID, _ := userIDValue.(uint)
		if currentUserID > 0 {
			for i := range replies {
				reactionType := h.postService.GetPostCommentLikeStatus(currentUserID, replies[i].ID)
				if reactionType != "" {
					replies[i].UserReaction = &reactionType
				}
			}
		}
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
			post.UserReaction = &like.Type
		}
	}
}

func (h *PostHandler) checkPostLikeStatus(postID, userID uint) bool {
	return false
}

// GetPostCommentByID fetches a single post comment with root context
func (h *PostHandler) GetPostCommentByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	comment, err := h.postService.GetCommentByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
		return
	}

	// If it's a root comment, return it
	if comment.ParentID == nil || *comment.ParentID == 0 {
		c.JSON(http.StatusOK, comment)
		return
	}

	// If it's a reply, find root parent
	current := comment
	path := []*domain.PostComment{comment}
	for i := 0; i < 10; i++ {
		if current.ParentID == nil || *current.ParentID == 0 {
			break
		}
		parent, err := h.postService.GetCommentByID(*current.ParentID)
		if err != nil {
			break
		}
		path = append([]*domain.PostComment{parent}, path...)
		current = parent
	}
	root := path[0]

	// Fetch all comments for this post to build the tree context
	allComments, _ := h.postService.GetCommentsByPostIDPaginated(root.PostID, 1000, 0)

	// Find root in results
	for _, r := range allComments {
		if r.ID == root.ID {
			count := countPostChildren(&r)
			if count > 100 {
				prunePostTree(&r, comment.ID)
			}
			c.JSON(http.StatusOK, r)
			return
		}
	}

	c.JSON(http.StatusOK, root)
}

func countPostChildren(c *domain.PostComment) int {
	total := len(c.Children)
	for i := range c.Children {
		total += countPostChildren(&c.Children[i])
	}
	return total
}

func prunePostTree(c *domain.PostComment, targetID uint) bool {
	if c.ID == targetID {
		return true
	}
	if len(c.Children) == 0 {
		return false
	}
	var newChildren []domain.PostComment
	foundInBranch := false
	for i := range c.Children {
		if prunePostTree(&c.Children[i], targetID) {
			newChildren = append(newChildren, c.Children[i])
			foundInBranch = true
		}
	}
	if foundInBranch {
		c.Children = newChildren
		return true
	}
	return false
}

// --- Reaction Tooltips ---

type ReactionUser struct {
	ID     uint   `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
}

func (h *PostHandler) GetPostReactions(c *gin.Context) {
	postID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post ID"})
		return
	}

	likes, err := h.postService.GetPostReactions(uint(postID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reactions"})
		return
	}

	result := make(map[string][]ReactionUser)
	for _, like := range likes {
		if like.User != nil {
			result[like.Type] = append(result[like.Type], ReactionUser{
				ID:     like.User.ID,
				Name:   like.User.Name,
				Avatar: like.User.Avatar,
			})
		}
	}

	c.JSON(http.StatusOK, result)
}

func (h *PostHandler) GetCommentReactions(c *gin.Context) {
	commentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	likes, err := h.postService.GetCommentReactions(uint(commentID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reactions"})
		return
	}

	result := make(map[string][]ReactionUser)
	for _, like := range likes {
		if like.User != nil {
			result[like.Type] = append(result[like.Type], ReactionUser{
				ID:     like.User.ID,
				Name:   like.User.Name,
				Avatar: like.User.Avatar,
			})
		}
	}

	c.JSON(http.StatusOK, result)
}
