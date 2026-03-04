package handler

import (
	"backend/internal/core/domain"
	"backend/internal/core/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	service *service.UserService
}

func NewUserHandler(service *service.UserService) *UserHandler {
	return &UserHandler{service: service}
}

func (h *UserHandler) GetAll(c *gin.Context) {
	query := c.Query("q")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "0"))
	var users []domain.User
	var err error

	if query != "" {
		users, err = h.service.Search(query)
	} else {
		users, err = h.service.GetAll(limit)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}

type CreateUserRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	RoleID   uint   `json:"role_id" binding:"required"`
}

func (h *UserHandler) Create(c *gin.Context) {
	name := c.PostForm("name")
	email := c.PostForm("email")
	password := c.PostForm("password")
	roleIDStr := c.PostForm("role_id")
	roleID, _ := strconv.Atoi(roleIDStr)

	var avatarPath string
	file, err := c.FormFile("avatar")
	if err == nil {
		filename := strconv.FormatInt(int64(c.Writer.Status()), 10) + "_" + file.Filename // Simple unique name
		// In production use UUID or similar
		dst := "uploads/avatars/" + filename
		if err := c.SaveUploadedFile(file, dst); err == nil {
			avatarPath = "/uploads/avatars/" + filename
		}
	}

	if err := h.service.Create(name, email, password, uint(roleID), avatarPath); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User created successfully"})
}

func (h *UserHandler) Update(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	name := c.PostForm("name")
	email := c.PostForm("email")
	roleIDStr := c.PostForm("role_id")
	roleID, _ := strconv.Atoi(roleIDStr)

	var avatarPath string
	file, err := c.FormFile("avatar")
	if err == nil {
		filename := strconv.FormatInt(int64(id), 10) + "_" + file.Filename
		dst := "uploads/avatars/" + filename
		if err := c.SaveUploadedFile(file, dst); err == nil {
			avatarPath = "/uploads/avatars/" + filename
		}
	}

	// We need to pass avatarPath to Update. If empty, service logic should decide whether to keep old one or clear it.
	// For simplicity, let's assume if empty we don't update it, or we need a way to clear it.
	// We'll update service signature shortly.
	password := c.PostForm("password")
	if err := h.service.Update(uint(id), name, email, password, uint(roleID), avatarPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Fetch updated user to return
	updatedUser, err := h.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User updated but failed to fetch details"})
		return
	}

	c.JSON(http.StatusOK, updatedUser)
}

func (h *UserHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	// 1. Get User ID from Context (set by AuthMiddleware)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	// Depending on middleware, it might be float64 (JWT default) or int/uint. Safe assertion:
	var userID uint
	switch v := userIDVal.(type) {
	case uint:
		userID = v
	case int:
		userID = uint(v)
	case float64:
		userID = uint(v)
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in context"})
		return
	}

	// 2. Parse Form Data
	name := c.PostForm("name")
	// If name is empty, we might want to fetch current or require it. Frontend sends it.

	currentPassword := c.PostForm("current_password")
	newPassword := c.PostForm("new_password")

	// 3. Handle Avatar File
	var avatarPath string
	file, err := c.FormFile("avatar")
	if err == nil {
		// Create unique filename
		filename := strconv.FormatInt(int64(userID), 10) + "_" + strconv.FormatInt(int64(c.Writer.Status()), 10) + "_" + file.Filename
		dst := "uploads/avatars/" + filename

		if err := c.SaveUploadedFile(file, dst); err == nil {
			avatarPath = "/uploads/avatars/" + filename
		} else {
			// Log error if needed
		}
	}

	// 3.5 Handle Cover Image File
	var coverImagePath string
	coverFile, err := c.FormFile("cover_image")
	if err == nil {
		filename := "cover_" + strconv.FormatInt(int64(userID), 10) + "_" + strconv.FormatInt(int64(c.Writer.Status()), 10) + "_" + coverFile.Filename
		dst := "uploads/avatars/" + filename // storing in same folder for now
		if err := c.SaveUploadedFile(coverFile, dst); err == nil {
			coverImagePath = "/uploads/avatars/" + filename
		}
	}

	// 4. Call Service
	updatedUser, err := h.service.UpdateProfile(userID, name, currentPassword, newPassword, avatarPath, coverImagePath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error(), "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user":    updatedUser,
	})
}

func (h *UserHandler) GetStats(c *gin.Context) {
	userID := c.GetUint("user_id")

	stats, err := h.service.GetUserStats(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *UserHandler) GetInteractions(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	// Depending on middleware, it might be float64 (JWT default) or int/uint. Safe assertion:
	var userID uint
	switch v := userIDVal.(type) {
	case uint:
		userID = v
	case int:
		userID = uint(v)
	case float64:
		userID = uint(v)
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in context"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	interactionType := c.Query("type") // "comment", "reply", "like"

	interactions, hasMore, err := h.service.GetPaginatedInteractions(userID, interactionType, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user interactions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    interactions,
		"has_more": hasMore,
	})
}

func (h *UserHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user, err := h.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// --- Friendship Handlers ---

func (h *UserHandler) SendFriendRequest(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var userID uint
	switch v := userIDVal.(type) {
	case uint:
		userID = v
	case int:
		userID = uint(v)
	case float64:
		userID = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type"})
		return
	}

	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target ID"})
		return
	}

	if err := h.service.SendFriendRequest(userID, uint(targetID)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Friend request sent"})
}

func (h *UserHandler) AcceptFriendRequest(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var userID uint
	switch v := userIDVal.(type) {
	case uint:
		userID = v
	case int:
		userID = uint(v)
	case float64:
		userID = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type"})
		return
	}

	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target ID"})
		return
	}

	if err := h.service.AcceptFriendRequest(userID, uint(targetID)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Friend request accepted"})
}

func (h *UserHandler) RemoveFriend(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var userID uint
	switch v := userIDVal.(type) {
	case uint:
		userID = v
	case int:
		userID = uint(v)
	case float64:
		userID = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type"})
		return
	}

	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target ID"})
		return
	}

	if err := h.service.RejectFriendRequest(userID, uint(targetID)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Removed/Rejected"})
}

func (h *UserHandler) GetFriendshipStatus(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	var userID uint
	if exists {
		// Handle type assertion safely as before
		switch v := userIDVal.(type) {
		case uint:
			userID = v
		case int:
			userID = uint(v)
		case float64:
			userID = uint(v)
		}
	} else {
		userID = 0 // Not logged in
	}

	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target ID"})
		return
	}

	status, err := h.service.GetFriendshipStatus(userID, uint(targetID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": status})
}

func (h *UserHandler) GetUserFriends(c *gin.Context) {
	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target ID"})
		return
	}

	friends, err := h.service.GetUserFriends(uint(targetID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"friends": friends})
}

func (h *UserHandler) GetPendingRequests(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	// Robust ID retrieval
	var userID uint
	switch v := userIDVal.(type) {
	case uint:
		userID = v
	case int:
		userID = uint(v)
	case float64:
		userID = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type"})
		return
	}

	requests, err := h.service.GetPendingRequests(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"requests": requests})
}

// --- Block Handlers ---

func (h *UserHandler) BlockUser(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var userID uint
	switch v := userIDVal.(type) {
	case uint:
		userID = v
	case int:
		userID = uint(v)
	case float64:
		userID = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type"})
		return
	}

	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target ID"})
		return
	}

	if err := h.service.BlockUser(userID, uint(targetID)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User blocked"})
}

func (h *UserHandler) UnblockUser(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	var userID uint
	switch v := userIDVal.(type) {
	case uint:
		userID = v
	case int:
		userID = uint(v)
	case float64:
		userID = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type"})
		return
	}

	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target ID"})
		return
	}

	if err := h.service.UnblockUser(userID, uint(targetID)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User unblocked"})
}
