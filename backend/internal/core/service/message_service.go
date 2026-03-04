package service

import (
	"backend/internal/adapters/ws"
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"encoding/json"
)

type MessageService struct {
	repo      port.MessageRepository
	notifRepo port.NotificationRepository
	userRepo  port.UserRepository
	hub       *ws.Hub
}

func NewMessageService(repo port.MessageRepository, notifRepo port.NotificationRepository, userRepo port.UserRepository, hub *ws.Hub) *MessageService {
	return &MessageService{
		repo:      repo,
		notifRepo: notifRepo,
		userRepo:  userRepo,
		hub:       hub,
	}
}

func (s *MessageService) SendMessage(senderID, receiverID uint, content string) (*domain.Message, error) {
	msg := &domain.Message{
		SenderID:   senderID,
		ReceiverID: receiverID,
		Content:    content,
	}

	if err := s.repo.SaveMessage(msg); err != nil {
		return nil, err
	}

	// 1. Broadcast real-time message
	wsMsg := map[string]interface{}{
		"type": "chat_message",
		"data": msg,
	}
	s.hub.BroadcastToUser(receiverID, "chat_message", wsMsg)
	s.hub.BroadcastToUser(senderID, "chat_message", wsMsg)

	// 2. Create persistent notification for the receiver
	// Fetch sender details for richer notifications
	sender, _ := s.userRepo.GetUserByID(senderID)

	data := map[string]interface{}{
		"sender_id":       senderID,
		"sender_name":     "",
		"sender_avatar":   "",
		"message_content": content,
	}
	if sender != nil {
		data["sender_name"] = sender.Name
		data["sender_avatar"] = sender.Avatar
	}

	dataBytes, _ := json.Marshal(data)

	notification := &domain.Notification{
		UserID: receiverID,
		Type:   domain.NotificationTypeChatMessage,
		Data:   domain.RawJSON(dataBytes),
	}

	if err := s.notifRepo.Create(notification); err == nil {
		// Broadcast notification event too for immediate red dot
		s.hub.BroadcastToUser(receiverID, "notification", map[string]interface{}{
			"type": "notification",
			"data": notification,
		})
	}

	return msg, nil
}

func (s *MessageService) GetChatHistory(user1, user2 uint, limit int) ([]domain.Message, error) {
	if limit <= 0 {
		limit = 50
	}
	return s.repo.GetChatHistory(user1, user2, limit)
}

func (s *MessageService) GetRecentConversations(userID uint) ([]domain.Conversation, error) {
	lastMessages, err := s.repo.GetRecentConversations(userID)
	if err != nil {
		return nil, err
	}

	var conversations []domain.Conversation
	for _, msg := range lastMessages {
		otherUserID := msg.SenderID
		if msg.SenderID == userID {
			otherUserID = msg.ReceiverID
		}

		unreadCount, _ := s.repo.CountUnreadBetweenUsers(otherUserID, userID)

		otherUser := msg.Sender
		if msg.SenderID == userID {
			otherUser = msg.Receiver
		}

		conversations = append(conversations, domain.Conversation{
			OtherUser:   otherUser,
			LastMessage: msg,
			UnreadCount: unreadCount,
		})
	}

	return conversations, nil
}

func (s *MessageService) MarkAsRead(senderID, receiverID uint) error {
	if err := s.repo.MarkAsRead(senderID, receiverID); err != nil {
		return err
	}

	// Broadcast read receipt to the original sender
	msg := map[string]interface{}{
		"type": "read_receipt",
		"data": map[string]interface{}{
			"receiver_id": receiverID, // The one who read it
			"sender_id":   senderID,
		},
	}
	s.hub.BroadcastToUser(senderID, "read_receipt", msg)
	return nil
}
