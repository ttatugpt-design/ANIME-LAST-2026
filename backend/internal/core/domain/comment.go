package domain

import "time"

// Comment represents a user comment on an episode
type Comment struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	Content       string    `json:"content" gorm:"type:text;not null"`
	UserID        uint      `json:"user_id" gorm:"not null"`
	User          *User     `json:"user" gorm:"foreignKey:UserID;references:ID"`
	EpisodeID     uint      `json:"episode_id" gorm:"not null"`
	Episode       *Episode  `json:"episode" gorm:"foreignKey:EpisodeID"`
	ChapterID     *uint     `json:"chapter_id"`
	Chapter       *Chapter  `json:"chapter" gorm:"foreignKey:ChapterID"`
	ParentID      *uint     `json:"parent_id,omitempty"`       // For nested replies
	MentionUserID *uint     `json:"mention_user_id,omitempty"` // User being @mentioned
	Parent        *Comment  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children      []Comment `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	
	// Reaction Counts
	Likes     int `json:"likes_count" gorm:"column:likes;default:0"`
	Loves     int `json:"loves_count" gorm:"column:loves;default:0"`
	Sads      int `json:"sads_count" gorm:"column:sads;default:0"`
	Angrys    int `json:"angrys_count" gorm:"column:angrys;default:0"`
	Wows      int `json:"wows_count" gorm:"column:wows;default:0"`
	Hahas     int `json:"hahas_count" gorm:"column:hahas;default:0"`
	SuperSads int `json:"super_sads_count" gorm:"column:super_sads;default:0"`

	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// Transient fields for current user interaction
	UserReaction *string `json:"user_reaction" gorm:"-"`
}

// CommentLike represents a user's reaction to a comment
type CommentLike struct {
	UserID    uint      `json:"user_id" gorm:"primaryKey"`
	User      *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
	CommentID uint      `json:"comment_id" gorm:"primaryKey"`
	Type      string    `json:"type" gorm:"not null;default:'like'"` // like, love, sad, angry, wow, haha, super_sad
	CreatedAt time.Time `json:"created_at"`
}
