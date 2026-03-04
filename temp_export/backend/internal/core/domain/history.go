package domain

import (
	"time"
)

type ActivityType string

const (
	ActivityEpisodeView ActivityType = "episode_view"
	ActivityAnimeView   ActivityType = "anime_view"
	ActivityComment     ActivityType = "comment"
	ActivityLike        ActivityType = "like"
	ActivityReply       ActivityType = "reply"
)

type History struct {
	ID     uint  `gorm:"primaryKey" json:"id"`
	UserID uint  `gorm:"index;not null" json:"user_id"`
	User   *User `gorm:"foreignKey:UserID" json:"user,omitempty"`

	ActivityType ActivityType `gorm:"type:varchar(50);not null;index" json:"activity_type"`

	// Polymorphic relations
	EpisodeID *uint    `gorm:"index" json:"episode_id,omitempty"`
	Episode   *Episode `gorm:"foreignKey:EpisodeID" json:"episode,omitempty"`

	AnimeID *uint  `gorm:"index" json:"anime_id,omitempty"`
	Anime   *Anime `gorm:"foreignKey:AnimeID" json:"anime,omitempty"`

	CommentID *uint    `gorm:"index" json:"comment_id,omitempty"`
	Comment   *Comment `gorm:"foreignKey:CommentID" json:"comment,omitempty"`

	// Metadata
	Image    string `gorm:"type:varchar(500)" json:"image,omitempty"` // Image path for quick display
	Metadata string `gorm:"type:text" json:"metadata,omitempty"`      // JSON for additional data

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
