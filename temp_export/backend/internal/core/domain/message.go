package domain

import (
	"time"
)

type Message struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	SenderID   uint      `gorm:"not null;index" json:"sender_id"`
	Sender     User      `gorm:"foreignKey:SenderID" json:"sender"`
	ReceiverID uint      `gorm:"not null;index" json:"receiver_id"`
	Receiver   User      `gorm:"foreignKey:ReceiverID" json:"receiver"`
	Content    string    `gorm:"type:text;not null" json:"content"`
	IsRead     bool      `gorm:"default:false" json:"is_read"`
	CreatedAt  time.Time `json:"created_at"`
}

type Conversation struct {
	OtherUser   User    `json:"other_user"`
	LastMessage Message `json:"last_message"`
	UnreadCount int64   `json:"unread_count"`
}
