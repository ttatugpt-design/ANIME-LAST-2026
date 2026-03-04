package handler

import (
	"backend/internal/adapters/repository"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	repo *repository.NotificationRepository
}

func NewNotificationHandler(repo *repository.NotificationRepository) *NotificationHandler {
	return &NotificationHandler{repo: repo}
}

// GetUserNotifications
func (h *NotificationHandler) GetUserNotifications(c *gin.Context) {
	userID := c.GetUint("user_id")
	limit := 20 // Default limit

	notifs, err := h.repo.GetUserNotifications(userID, limit)
	if err != nil {
		log.Printf("[NotificationHandler.GetUserNotifications] Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	c.JSON(http.StatusOK, notifs)
}

// MarkRead
func (h *NotificationHandler) MarkRead(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	userID := c.GetUint("user_id")
	if err := h.repo.MarkRead(uint(id), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

// MarkAllRead
func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userID := c.GetUint("user_id")
	if err := h.repo.MarkAllRead(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark all as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

// Delete
func (h *NotificationHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	userID := c.GetUint("user_id")
	if err := h.repo.Delete(uint(id), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

// DeleteAll
func (h *NotificationHandler) DeleteAll(c *gin.Context) {
	userID := c.GetUint("user_id")
	if err := h.repo.DeleteAll(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete all notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}

// DeleteSelected
func (h *NotificationHandler) DeleteSelected(c *gin.Context) {
	var input struct {
		IDs []uint `json:"ids"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("user_id")
	if err := h.repo.DeleteSelected(userID, input.IDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete selected notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Success"})
}
