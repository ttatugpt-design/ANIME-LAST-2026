package handler

import (
	"backend/internal/adapters/repository"
	"backend/internal/adapters/ws"
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"backend/internal/core/service"
	"encoding/json"
	"log"
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
		Content       string `json:"content" binding:"required"`
		EpisodeID     uint   `json:"episode_id"` // Optional if passing via param
		ChapterID     uint   `json:"chapter_id"` // Optional if passing via param
		ParentID      *uint  `json:"parent_id"`
		MentionUserID *uint  `json:"mention_user_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// If ID is in param, we need to know if it's episode or chapter
	idParam := c.Param("id")
	if idParam != "" {
		id, _ := strconv.Atoi(idParam)
		// How do we know if it's episode or chapter? 
		// Usually by the path. Let's check the path.
		if strings.Contains(c.Request.URL.Path, "episodes") {
			input.EpisodeID = uint(id)
		} else if strings.Contains(c.Request.URL.Path, "chapters") {
			input.ChapterID = uint(id)
		}
	}

	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Missing valid user session"})
		return
	}

	comment := domain.Comment{
		Content:       input.Content,
		UserID:        userID,
		ParentID:      input.ParentID,
		MentionUserID: input.MentionUserID,
	}

	if input.EpisodeID != 0 {
		comment.EpisodeID = input.EpisodeID
	}
	if input.ChapterID != 0 {
		comment.ChapterID = &input.ChapterID
	}

	if err := h.repo.Create(&comment); err != nil {
		log.Printf("[CreateComment ERROR] userID=%d episodeID=%d err=%v", userID, comment.EpisodeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Fetch full comment with preloaded User to avoid "Unknown User" on frontend
	if fullComment, err := h.repo.GetByID(comment.ID); err == nil {
		comment = *fullComment
	}

	// NOTIFICATION LOGIC
	if comment.ParentID != nil {
		parent, err := h.repo.GetByID(*comment.ParentID)
		if err == nil {
			// Rich metadata for notifications
			var animeTitle, animeImage, contextThumb string
			var animeID, contextID uint
			var contextNum float64

			if parent.EpisodeID != 0 {
				animeTitle = parent.Episode.Anime.Title
				animeImage = parent.Episode.Anime.Image
				epNum := parent.Episode.EpisodeNumber
				animeID = parent.Episode.AnimeID
				contextID = parent.EpisodeID
				contextNum = float64(epNum)
				contextThumb = parent.Episode.Thumbnail
			} else if parent.ChapterID != nil {
				animeTitle = parent.Chapter.Anime.Title
				animeImage = parent.Chapter.Anime.Image
				chNum := parent.Chapter.ChapterNumber
				animeID = parent.Chapter.AnimeID
				contextID = *parent.ChapterID
				contextNum = float64(chNum)
				contextThumb = parent.Chapter.Anime.Image
			}

			dataPayload := gin.H{
				"comment_id":      comment.ID,
				"parent_id":       parent.ID,
				"actor_id":        userID,
				"actor_name":      comment.User.Name,
				"actor_avatar":    comment.User.Avatar,
				"comment_content": parent.Content,
				"reply_content":   comment.Content,
				"anime_id":        animeID,
				"anime_title":     animeTitle,
				"anime_image":     animeImage,
				"episode_id":      contextID, // Reuse episode_id key for front-end compatibility or use context keys
				"chapter_id":      parent.ChapterID,
				"episode_number":  contextNum,
				"episode_image":   contextThumb,
				"is_reply_to_reply": parent.ParentID != nil && *parent.ParentID != 0,
			}
			if parent.Parent != nil && parent.Parent.User != nil {
				dataPayload["parent_target_name"] = parent.Parent.User.Name
			}
			dataJSON, _ := json.Marshal(dataPayload)

			parentOwnerNotified := false

			// 1. Notify Mentioned User (if different from current user)
			if comment.MentionUserID != nil && *comment.MentionUserID != userID {
				// Use the specific reply from the mentioned user as the context if found
				mentionDataJSON := dataJSON
				if mentionedUserReply, err := h.repo.GetMostRecentByUserAndParent(*comment.MentionUserID, parent.ID); err == nil && mentionedUserReply != nil {
					// Create a specialized payload for the mentioned user
					mentionDataPayload := make(gin.H)
					for k, v := range dataPayload { mentionDataPayload[k] = v }
					mentionDataPayload["comment_content"] = mentionedUserReply.Content
					mentionDataPayload["is_reply_to_reply"] = true // It's a reply to their specific reply
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

		// Track History
		repliedToUser := "User"
		if parent != nil && parent.User != nil {
			repliedToUser = parent.User.Name
		}
		var contextID uint
		if comment.EpisodeID != 0 {
			contextID = comment.EpisodeID
		} else if comment.ChapterID != nil {
			contextID = *comment.ChapterID
		}
		metadata := `{"content": "` + escapeJSON(comment.Content) + `", "replied_to_user": "` + escapeJSON(repliedToUser) + `", "id": ` + strconv.Itoa(int(contextID)) + `}`
		go h.historyService.TrackWithMetadata(userID, domain.ActivityReply, &contextID, nil, &comment.ID, metadata, "")
	} else {
		var contextID uint
		if comment.EpisodeID != 0 {
			contextID = comment.EpisodeID
		} else if comment.ChapterID != nil {
			contextID = *comment.ChapterID
		}
		metadata := `{"content": "` + escapeJSON(comment.Content) + `", "id": ` + strconv.Itoa(int(contextID)) + `}`
		go h.historyService.TrackWithMetadata(userID, domain.ActivityComment, &contextID, nil, &comment.ID, metadata, "")
	}

	// Broadcast to episode/chapter topic for real-time updates
	topic := ""
	if comment.EpisodeID != 0 {
		topic = "episode:" + strconv.Itoa(int(comment.EpisodeID))
	} else if comment.ChapterID != nil {
		topic = "chapter:" + strconv.Itoa(int(*comment.ChapterID))
	}
	h.hub.BroadcastToTopic(topic, gin.H{
		"type": "comment",
		"data": comment,
	})

	c.JSON(http.StatusCreated, comment)
}

// GetAllByEpisode fetches comments for an episode (paginated)
func (h *CommentHandler) GetAllByEpisode(c *gin.Context) {
	episodeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode ID"})
		return
	}

	// Get current user ID (optional - may be 0 if unauthenticated)
	userIDValue, _ := c.Get("user_id")
	currentUserID, _ := userIDValue.(uint)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "0"))

	attachUserReactions := func(comments []domain.Comment) {
		if currentUserID == 0 { return }
		for i := range comments {
			reactionType := h.repo.GetCommentLikeStatus(currentUserID, comments[i].ID)
			if reactionType != "" {
				comments[i].UserReaction = &reactionType
			}
			for j := range comments[i].Children {
				rt := h.repo.GetCommentLikeStatus(currentUserID, comments[i].Children[j].ID)
				if rt != "" {
					comments[i].Children[j].UserReaction = &rt
				}
			}
		}
	}

	if page > 0 {
		// Paginated mode
		if limit <= 0 { limit = 10 }
		comments, total, err := h.repo.GetByEpisodeIDPaginated(uint(episodeID), page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
			return
		}
		attachUserReactions(comments)
		c.Header("X-Total-Count", strconv.FormatInt(total, 10))
		c.JSON(http.StatusOK, comments)
		return
	}

	// Non-paginated fallback (legacy)
	comments, err := h.repo.GetByEpisodeID(uint(episodeID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}
	attachUserReactions(comments)
	c.JSON(http.StatusOK, comments)
}

// GetAllByChapter fetches comments for a chapter (paginated)
func (h *CommentHandler) GetAllByChapter(c *gin.Context) {
	chapterID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chapter ID"})
		return
	}

	userIDValue, _ := c.Get("user_id")
	currentUserID, _ := userIDValue.(uint)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "0"))

	attachUserReactions := func(comments []domain.Comment) {
		if currentUserID == 0 { return }
		for i := range comments {
			reactionType := h.repo.GetCommentLikeStatus(currentUserID, comments[i].ID)
			if reactionType != "" {
				comments[i].UserReaction = &reactionType
			}
			for j := range comments[i].Children {
				rt := h.repo.GetCommentLikeStatus(currentUserID, comments[i].Children[j].ID)
				if rt != "" {
					comments[i].Children[j].UserReaction = &rt
				}
			}
		}
	}

	if page > 0 {
		if limit <= 0 { limit = 10 }
		comments, total, err := h.repo.GetByChapterIDPaginated(uint(chapterID), page, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
			return
		}
		attachUserReactions(comments)
		c.Header("X-Total-Count", strconv.FormatInt(total, 10))
		c.JSON(http.StatusOK, comments)
		return
	}

	comments, err := h.repo.GetByChapterID(uint(chapterID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}
	attachUserReactions(comments)
	c.JSON(http.StatusOK, comments)
}

// ToggleLike handles reactions for episode/chapter comments
func (h *CommentHandler) ToggleLike(c *gin.Context) {
	commentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	var input struct {
		Type string `json:"type" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reaction type is required"})
		return
	}

	userID := c.GetUint("user_id")

	if err := h.repo.ToggleLike(uint(userID), uint(commentID), input.Type); err != nil {
		log.Printf("[ToggleLike ERROR] userID=%d commentID=%d type=%s err=%v", userID, commentID, input.Type, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// NOTIFICATION LOGIC: Reaction Notification
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

			var animeTitle, animeImage, contextThumb string
			var animeID, contextID uint
			var contextNum float64

			if target.EpisodeID != 0 {
				animeID = target.Episode.AnimeID
				animeTitle = target.Episode.Anime.Title
				animeImage = target.Episode.Anime.Image
				contextID = target.EpisodeID
				contextNum = float64(target.Episode.EpisodeNumber)
				contextThumb = target.Episode.Thumbnail
			} else if target.ChapterID != nil {
				animeID = target.Chapter.AnimeID
				animeTitle = target.Chapter.Anime.Title
				animeImage = target.Chapter.Anime.Image
				contextID = *target.ChapterID
				contextNum = float64(target.Chapter.ChapterNumber)
				contextThumb = target.Chapter.Anime.Image
			}

			dataPayload := gin.H{
				"comment_id":      target.ID,
				"parent_id":       target.ParentID,
				"actor_id":        userID,
				"actor_name":      actorName,
				"actor_avatar":    actorAvatar,
				"comment_content": target.Content,
				"anime_id":        animeID,
				"anime_title":     animeTitle,
				"anime_image":     animeImage,
				"episode_id":      contextID,
				"chapter_id":      target.ChapterID,
				"episode_number":  contextNum,
				"episode_image":   contextThumb,
				"reaction_type":   input.Type,
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

		// Broadcast reaction update to episode/chapter topic 
		topic := ""
		if target.EpisodeID != 0 {
			topic = "episode:" + strconv.Itoa(int(target.EpisodeID))
		} else if target.ChapterID != nil {
			topic = "chapter:" + strconv.Itoa(int(*target.ChapterID))
		}

		h.hub.BroadcastToTopic(topic, gin.H{
			"type": "comment_like",
			"data": gin.H{
				"comment_id": commentID,
				"type":       input.Type,
				"user_id":    userID,
			},
		})

		// Track Reaction in History with metadata
		commentIDUint := uint(commentID)
		ownerName := "User"
		if target.User != nil {
			ownerName = target.User.Name
		}
		metadata := `{"comment_content": "` + escapeJSON(target.Content) + `", "comment_owner": "` + escapeJSON(ownerName) + `", "episode_id": ` + strconv.Itoa(int(target.EpisodeID)) + `}`
		go h.historyService.TrackWithMetadata(userID, domain.ActivityLike, &target.EpisodeID, nil, &commentIDUint, metadata, "")
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
// GetByID fetches a single comment by its ID
func (h *CommentHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	comment, err := h.repo.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
		return
	}

	// If it's a root comment, we might still want to return it but we should check if we want to preload all children
	if comment.ParentID == nil || *comment.ParentID == 0 {
		// Just return the root comment. Frontend will fetch children via the main list or we can preload some.
		// For consistency, if it's highlighted, let's fetch its first 100 children if any.
        // But for now, returning root is fine as root is what's displayed.
		c.JSON(http.StatusOK, comment)
		return
	}

	// If it's a reply, find the root parent and decide context depth
	current := comment
	path := []*domain.Comment{comment}
	for i := 0; i < 10; i++ { // Path depth limit
		if current.ParentID == nil || *current.ParentID == 0 {
			break
		}
		parent, err := h.repo.GetByID(*current.ParentID)
		if err != nil {
			break
		}
		path = append([]*domain.Comment{parent}, path...)
		current = parent
	}
	root := path[0]

	// New Strategy:
	// If we have a highlighted thread, we want it to be "complete" in the pinned section.
	var allComments []domain.Comment
	if root.ChapterID != nil {
		allComments, _ = h.repo.GetByChapterID(*root.ChapterID)
	} else {
		allComments, _ = h.repo.GetByEpisodeID(root.EpisodeID)
	}

	// Find our root in the list and use it (it will have all children mapped)
	for _, r := range allComments {
		if r.ID == root.ID {
			// Total replies in this specific tree
			count := countChildren(&r)
			
			if count > 100 {
				// Prune tree to only show path to 'comment.ID'
				pruneTree(&r, comment.ID)
			}
			
			c.JSON(http.StatusOK, r)
			return
		}
	}
	
	c.JSON(http.StatusOK, root)
}

func countChildren(c *domain.Comment) int {
	total := len(c.Children)
	for i := range c.Children {
		total += countChildren(&c.Children[i])
	}
	return total
}

func pruneTree(c *domain.Comment, targetID uint) bool {
	if c.ID == targetID {
		return true
	}
	
	if len(c.Children) == 0 {
		return false
	}
	
	var newChildren []domain.Comment
	foundInBranch := false
	
	for i := range c.Children {
		if pruneTree(&c.Children[i], targetID) {
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

// GetReactions fetches user profiles mapped by reaction type (for tooltips)
func (h *CommentHandler) GetReactions(c *gin.Context) {
	commentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	likes, err := h.repo.GetReactions(uint(commentID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reactions"})
		return
	}

	result := make(map[string][]struct{
		ID uint `json:"id"`
		Name string `json:"name"`
		Avatar string `json:"avatar"`
	})
	
	for _, like := range likes {
		if like.User != nil {
			result[like.Type] = append(result[like.Type], struct{
				ID uint `json:"id"`
				Name string `json:"name"`
				Avatar string `json:"avatar"`
			}{
				ID:     like.User.ID,
				Name:   like.User.Name,
				Avatar: like.User.Avatar,
			})
		}
	}

	c.JSON(http.StatusOK, result)
}
