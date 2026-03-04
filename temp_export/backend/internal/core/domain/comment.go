package domain

import "time"

// Comment represents a user comment on an episode
type Comment struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Content   string    `json:"content" gorm:"type:text;not null"`
	UserID    uint      `json:"user_id" gorm:"not null"`
	User      *User     `json:"user" gorm:"foreignKey:UserID;references:ID"`
	EpisodeID uint      `json:"episode_id" gorm:"not null"`
	Episode   *Episode  `json:"episode" gorm:"foreignKey:EpisodeID"`
	ParentID  *uint     `json:"parent_id,omitempty"` // For nested replies
	Parent    *Comment  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children  []Comment `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	Likes     int       `json:"likes" gorm:"default:0"`
	Dislikes  int       `json:"dislikes" gorm:"default:0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Transient fields for current user interaction
	UserInteraction *bool `json:"user_interaction,omitempty" gorm:"-"` // true = like, false = dislike, null = none
}

// CommentLike represents a user's reaction to a comment
type CommentLike struct {
	UserID    uint      `json:"user_id" gorm:"primaryKey"`
	CommentID uint      `json:"comment_id" gorm:"primaryKey"`
	IsLike    bool      `json:"is_like"` // true = like, false = dislike
	CreatedAt time.Time `json:"created_at"`
}
