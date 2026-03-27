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

func (s *MessageService) SendMessage(senderID, receiverID uint, content string, parentID *uint) (*domain.Message, error) {
	msg := &domain.Message{
		SenderID:   senderID,
		ReceiverID: receiverID,
		Content:    content,
		ParentID:   parentID,
	}

	if err := s.repo.SaveMessage(msg); err != nil {
		return nil, err
	}

	// Preload for full broadcasting (including sender and parent if exists)
	fullMsg, err := s.repo.GetMessageByID(msg.ID)
	if err == nil {
		msg = fullMsg
	}

	// 1. Broadcast real-time message
	wsMsg := map[string]interface{}{
		"type": "chat_message",
		"data": msg,
	}
	s.hub.BroadcastToUser(receiverID, "chat_message", wsMsg)
	s.hub.BroadcastToUser(senderID, "chat_message", wsMsg)

	// 2. Create persistent notification for the receiver
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
		s.hub.BroadcastToUser(receiverID, "notification", map[string]interface{}{
			"type": "notification",
			"data": notification,
		})
	}

	return msg, nil
}

func (s *MessageService) EditMessage(msgID, userID uint, content string) (*domain.Message, error) {
	msg, err := s.repo.GetMessageByID(msgID)
	if err != nil {
		return nil, err
	}

	if msg.SenderID != userID {
		return nil, nil // Not authorized
	}

	msg.Content = content
	msg.IsEdited = true
	if err := s.repo.UpdateMessage(msg); err != nil {
		return nil, err
	}

	// Broadcast edit event
	wsMsg := map[string]interface{}{
		"type": "message_edited",
		"data": msg,
	}
	s.hub.BroadcastToUser(msg.ReceiverID, "message_edited", wsMsg)
	s.hub.BroadcastToUser(msg.SenderID, "message_edited", wsMsg)

	return msg, nil
}

func (s *MessageService) DeleteMessage(msgID, userID uint) error {
	msg, err := s.repo.GetMessageByID(msgID)
	if err != nil {
		return err
	}

	if msg.SenderID != userID && msg.ReceiverID != userID {
		return nil // Not authorized
	}

	if msg.SenderID == userID {
		if err := s.repo.DeleteMessage(msgID); err != nil {
			return err
		}

		// Broadcast delete event
		wsMsg := map[string]interface{}{
			"type": "message_deleted",
			"data": map[string]interface{}{
				"message_id":  msgID,
				"sender_id":   msg.SenderID,
				"receiver_id": msg.ReceiverID,
			},
		}
		s.hub.BroadcastToUser(msg.ReceiverID, "message_deleted", wsMsg)
		s.hub.BroadcastToUser(msg.SenderID, "message_deleted", wsMsg)
	} else if msg.ReceiverID == userID {
		msg.DeletedByReceiver = true
		if err := s.repo.UpdateMessage(msg); err != nil {
			return err
		}

		// Broadcast delete event ONLY to receiver
		wsMsg := map[string]interface{}{
			"type": "message_deleted",
			"data": map[string]interface{}{
				"message_id":  msgID,
				"sender_id":   msg.SenderID,
				"receiver_id": msg.ReceiverID,
			},
		}
		s.hub.BroadcastToUser(userID, "message_deleted", wsMsg)
	}

	return nil
}

func (s *MessageService) ToggleReaction(msgID, userID uint, reactionType string) error {
	msg, err := s.repo.GetMessageByID(msgID)
	if err != nil {
		return err
	}

	// If reactionType is empty, remove reaction
	if reactionType == "" {
		if err := s.repo.DeleteReaction(msgID, userID); err != nil {
			return err
		}
	} else {
		reaction := &domain.MessageReaction{
			MessageID: msgID,
			UserID:    userID,
			Type:      reactionType,
		}
		if err := s.repo.SaveReaction(reaction); err != nil {
			return err
		}
	}

	// Fetch updated message for full sync
	updatedMsg, _ := s.repo.GetMessageByID(msgID)

	// Broadcast react event
	wsMsg := map[string]interface{}{
		"type": "message_reacted",
		"data": updatedMsg,
	}
	s.hub.BroadcastToUser(msg.ReceiverID, "message_reacted", wsMsg)
	s.hub.BroadcastToUser(msg.SenderID, "message_reacted", wsMsg)

	return nil
}

func (s *MessageService) DeleteAllMessages(user1, user2 uint) error {
	if err := s.repo.DeleteAllMessagesBetweenUsers(user1, user2); err != nil {
		return err
	}

	// Broadcast clear event
	wsMsg := map[string]interface{}{
		"type": "chat_cleared",
		"data": map[string]interface{}{
			"user1_id": user1,
			"user2_id": user2,
		},
	}
	s.hub.BroadcastToUser(user1, "chat_cleared", wsMsg)
	s.hub.BroadcastToUser(user2, "chat_cleared", wsMsg)

	return nil
}

func (s *MessageService) GetChatHistory(user1, user2 uint, limit, offset int) ([]domain.Message, error) {
	if limit <= 0 {
		limit = 50
	}
	return s.repo.GetChatHistory(user1, user2, limit, offset)
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
