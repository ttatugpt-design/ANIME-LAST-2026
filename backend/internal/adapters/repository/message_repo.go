package repository

import (
	"backend/internal/core/domain"
	"fmt"

	"gorm.io/gorm"
)

type MessageRepository struct {
	db *gorm.DB
}

func NewMessageRepository(db *gorm.DB) *MessageRepository {
	return &MessageRepository{db: db}
}

func (r *MessageRepository) SaveMessage(msg *domain.Message) error {
	return r.db.Create(msg).Error
}

func (r *MessageRepository) GetChatHistory(user1, user2 uint, limit int) ([]domain.Message, error) {
	var messages []domain.Message
	err := r.db.Preload("Sender").Preload("Receiver").
		Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)", user1, user2, user2, user1).
		Order("id desc").
		Limit(limit).
		Find(&messages).Error

	if err != nil {
		return nil, err
	}

	// Reverse to restore chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

func (r *MessageRepository) GetRecentConversations(userID uint) ([]domain.Message, error) {
	var messages []domain.Message

	// Query to get unique conversations with latest message
	// CASE statement groups by the "other" user in the conversation
	subQuery := r.db.Model(&domain.Message{}).
		Select("MAX(id) as id").
		Where("sender_id = ? OR receiver_id = ?", userID, userID).
		Group(fmt.Sprintf("CASE WHEN sender_id = %d THEN receiver_id ELSE sender_id END", userID))

	err := r.db.Preload("Sender").Preload("Receiver").
		Where("id IN (?)", subQuery).
		Order("created_at desc").
		Find(&messages).Error

	return messages, err
}

func (r *MessageRepository) MarkAsRead(senderID, receiverID uint) error {
	return r.db.Model(&domain.Message{}).
		Where("sender_id = ? AND receiver_id = ? AND is_read = ?", senderID, receiverID, false).
		Update("is_read", true).Error
}

func (r *MessageRepository) CountUnreadBetweenUsers(senderID, receiverID uint) (int64, error) {
	var count int64
	err := r.db.Model(&domain.Message{}).
		Where("sender_id = ? AND receiver_id = ? AND is_read = ?", senderID, receiverID, false).
		Count(&count).Error
	return count, err
}
