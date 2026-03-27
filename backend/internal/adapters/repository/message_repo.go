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

func (r *MessageRepository) GetMessageByID(id uint) (*domain.Message, error) {
	var msg domain.Message
	err := r.db.Preload("Sender").Preload("Receiver").Preload("Reactions.User").Preload("Parent").First(&msg, id).Error
	return &msg, err
}

func (r *MessageRepository) GetChatHistory(user1, user2 uint, limit, offset int) ([]domain.Message, error) {
	var messages []domain.Message
	err := r.db.Preload("Sender").Preload("Receiver").
		Preload("Reactions.User").Preload("Parent").
		Where("((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))", user1, user2, user2, user1).
		Where("NOT (receiver_id = ? AND deleted_by_receiver = ?)", user1, true).
		Order("id desc").
		Limit(limit).
		Offset(offset).
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
	subQuery := r.db.Model(&domain.Message{}).
		Select("MAX(id) as id").
		Where("(sender_id = ? OR receiver_id = ?)", userID, userID).
		Where("NOT (receiver_id = ? AND deleted_by_receiver = ?)", userID, true).
		Group(fmt.Sprintf("CASE WHEN sender_id = %d THEN receiver_id ELSE sender_id END", userID))

	err := r.db.Preload("Sender").Preload("Receiver").Preload("Reactions.User").
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

func (r *MessageRepository) UpdateMessage(msg *domain.Message) error {
	return r.db.Save(msg).Error
}

func (r *MessageRepository) DeleteMessage(id uint) error {
	return r.db.Delete(&domain.Message{}, id).Error
}

func (r *MessageRepository) SaveReaction(reaction *domain.MessageReaction) error {
	// Upsert reaction: one user can have only one reaction per message
	return r.db.Where("message_id = ? AND user_id = ?", reaction.MessageID, reaction.UserID).
		Assign(map[string]interface{}{"type": reaction.Type, "created_at": reaction.CreatedAt}).
		FirstOrCreate(reaction).Error
}

func (r *MessageRepository) DeleteReaction(messageID, userID uint) error {
	return r.db.Where("message_id = ? AND user_id = ?", messageID, userID).
		Delete(&domain.MessageReaction{}).Error
}

func (r *MessageRepository) DeleteAllMessagesBetweenUsers(user1, user2 uint) error {
	return r.db.Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)", user1, user2, user2, user1).
		Delete(&domain.Message{}).Error
}
