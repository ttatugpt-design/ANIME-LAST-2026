package domain

import (
	"time"

	"gorm.io/gorm"
)

type Message struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	SenderID   uint           `gorm:"not null;index" json:"sender_id"`
	Sender     User           `gorm:"foreignKey:SenderID" json:"sender"`
	ReceiverID uint           `gorm:"not null;index" json:"receiver_id"`
	Receiver   User           `gorm:"foreignKey:ReceiverID" json:"receiver"`
	Content    string         `gorm:"type:text;not null" json:"content"`
	IsRead     bool           `gorm:"default:false" json:"is_read"`
	ParentID          *uint             `gorm:"index" json:"parent_id"`
	Parent            *Message          `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	IsEdited          bool              `gorm:"default:false" json:"is_edited"`
	DeletedByReceiver bool              `gorm:"default:false" json:"deleted_by_receiver"`
	Reactions         []MessageReaction `gorm:"foreignKey:MessageID" json:"reactions"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
	DeletedAt         gorm.DeletedAt    `gorm:"index" json:"-"`
}

type MessageReaction struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	MessageID uint      `gorm:"not null;index" json:"message_id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user"`
	Type      string    `gorm:"not null" json:"type"` // like, love, haha, etc.
	CreatedAt time.Time `json:"created_at"`
}

type Conversation struct {
	OtherUser   User    `json:"other_user"`
	LastMessage Message `json:"last_message"`
	UnreadCount int64   `json:"unread_count"`
}
