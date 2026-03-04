package handler

import (
	"backend/internal/core/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type MessageHandler struct {
	svc *service.MessageService
}

func NewMessageHandler(svc *service.MessageService) *MessageHandler {
	return &MessageHandler{svc: svc}
}

func (h *MessageHandler) SendMessage(c *gin.Context) {
	senderID := c.GetUint("user_id")
	var req struct {
		ReceiverID uint   `json:"receiver_id" binding:"required"`
		Content    string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msg, err := h.svc.SendMessage(senderID, req.ReceiverID, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	c.JSON(http.StatusOK, msg)
}

func (h *MessageHandler) GetChatHistory(c *gin.Context) {
	myID := c.GetUint("user_id")
	otherIDStr := c.Param("userId")
	otherID, _ := strconv.ParseUint(otherIDStr, 10, 32)

	limitStr := c.Query("limit")
	limit, _ := strconv.Atoi(limitStr)
	if limit == 0 {
		limit = 50
	}

	history, err := h.svc.GetChatHistory(myID, uint(otherID), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch history"})
		return
	}

	// Mark as read when opening chat
	h.svc.MarkAsRead(uint(otherID), myID)

	c.JSON(http.StatusOK, gin.H{"messages": history})
}

func (h *MessageHandler) GetRecentConversations(c *gin.Context) {
	userID := c.GetUint("user_id")

	conversations, err := h.svc.GetRecentConversations(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch conversations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"conversations": conversations})
}
