package domain

import "time"

// Post represents a user's community post
type Post struct {
	ID        uint        `json:"id" gorm:"primaryKey"`
	UserID    uint        `json:"user_id" gorm:"not null"`
	User      *User       `json:"user" gorm:"foreignKey:UserID;references:ID"`
	Content   string      `json:"content" gorm:"type:text;not null"`
	Media     []PostMedia `json:"media" gorm:"foreignKey:PostID;constraint:OnDelete:CASCADE;"`
	
	// Reaction Counts
	Likes     int `json:"likes_count" gorm:"default:0"`
	Loves     int `json:"loves_count" gorm:"default:0"`
	Sads      int `json:"sads_count" gorm:"default:0"`
	Angrys    int `json:"angrys_count" gorm:"default:0"`
	Wows      int `json:"wows_count" gorm:"default:0"`
	Hahas     int `json:"hahas_count" gorm:"default:0"`
	SuperSads int `json:"super_sads_count" gorm:"default:0"`

	Comments  int         `json:"comments_count" gorm:"default:0"` // cached count
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`

	// Transient - user's specific reaction (e.g. "like", "love", etc.)
	UserReaction *string `json:"user_reaction" gorm:"-"`
}

// PostMedia represents a media file (image or video) attached to a post
type PostMedia struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	PostID    uint      `json:"post_id" gorm:"not null"`
	MediaType string    `json:"media_type" gorm:"not null"` // "image" or "video"
	MediaURL  string    `json:"media_url" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}

// PostLike represents a user's reaction to a post
type PostLike struct {
	UserID    uint      `json:"user_id" gorm:"primaryKey"`
	User      *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
	PostID    uint      `json:"post_id" gorm:"primaryKey"`
	Type      string    `json:"type" gorm:"not null;default:'like'"` // like, love, sad, angry, wow, haha, super_sad
	CreatedAt time.Time `json:"created_at"`
}

// PostComment represents a user comment on a post
type PostComment struct {
	ID            uint          `json:"id" gorm:"primaryKey"`
	Content       string        `json:"content" gorm:"type:text;not null"`
	UserID        uint          `json:"user_id" gorm:"not null"`
	User          *User         `json:"user" gorm:"foreignKey:UserID;references:ID"`
	PostID        uint          `json:"post_id" gorm:"not null"`
	Post          *Post         `json:"post" gorm:"foreignKey:PostID;constraint:OnDelete:CASCADE;"`
	ParentID      *uint         `json:"parent_id,omitempty"` // For nested replies
	Parent        *PostComment  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	MentionUserID *uint         `json:"mention_user_id,omitempty"` // For replying to a specific user inside a reply
	Children      []PostComment `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	
	// Reaction Counts
	Likes     int `json:"likes_count" gorm:"column:likes;default:0"`
	Loves     int `json:"loves_count" gorm:"column:loves;default:0"`
	Sads      int `json:"sads_count" gorm:"column:sads;default:0"`
	Angrys    int `json:"angrys_count" gorm:"column:angrys;default:0"`
	Wows      int `json:"wows_count" gorm:"column:wows;default:0"`
	Hahas     int `json:"hahas_count" gorm:"column:hahas;default:0"`
	SuperSads int `json:"super_sads_count" gorm:"column:super_sads;default:0"`

	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`

	// Transient
	UserReaction *string `json:"user_reaction" gorm:"-"`
}

// PostCommentLike represents a user's reaction to a post comment
type PostCommentLike struct {
	UserID    uint      `json:"user_id" gorm:"primaryKey"`
	User      *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
	CommentID uint      `json:"comment_id" gorm:"primaryKey"`
	Type      string    `json:"type" gorm:"not null;default:'like'"` // like, love, sad, angry, wow, haha, super_sad
	CreatedAt time.Time `json:"created_at"`
}
