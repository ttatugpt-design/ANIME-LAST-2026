package domain

import "time"

// Post represents a user's community post
type Post struct {
	ID        uint        `json:"id" gorm:"primaryKey"`
	UserID    uint        `json:"user_id" gorm:"not null"`
	User      *User       `json:"user" gorm:"foreignKey:UserID;references:ID"`
	Content   string      `json:"content" gorm:"type:text;not null"`
	Images    []PostImage `json:"images" gorm:"foreignKey:PostID;constraint:OnDelete:CASCADE;"`
	Likes     int         `json:"likes_count" gorm:"default:0"`
	Comments  int         `json:"comments_count" gorm:"default:0"` // cached count
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`

	// Transient
	UserInteraction *bool `json:"is_liked,omitempty" gorm:"-"` // true = like
}

// PostImage represents an image attached to a post
type PostImage struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	PostID    uint      `json:"post_id" gorm:"not null"`
	ImageURL  string    `json:"image_url" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}

// PostLike represents a user liking a post
type PostLike struct {
	UserID    uint      `json:"user_id" gorm:"primaryKey"`
	PostID    uint      `json:"post_id" gorm:"primaryKey"`
	IsLike    bool      `json:"is_like"` // Assuming simple like for now, but boolean allows extendability
	CreatedAt time.Time `json:"created_at"`
}

// PostComment represents a user comment on a post
type PostComment struct {
	ID        uint          `json:"id" gorm:"primaryKey"`
	Content   string        `json:"content" gorm:"type:text;not null"`
	UserID    uint          `json:"user_id" gorm:"not null"`
	User      *User         `json:"user" gorm:"foreignKey:UserID;references:ID"`
	PostID    uint          `json:"post_id" gorm:"not null"`
	Post      *Post         `json:"post" gorm:"foreignKey:PostID;constraint:OnDelete:CASCADE;"`
	ParentID  *uint         `json:"parent_id,omitempty"` // For nested replies
	Parent    *PostComment  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children  []PostComment `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	Likes     int           `json:"likes" gorm:"default:0"`
	Dislikes  int           `json:"dislikes" gorm:"default:0"`
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`

	// Transient
	UserInteraction *bool `json:"user_interaction,omitempty" gorm:"-"`
}

// PostCommentLike represents a user's reaction to a post comment
type PostCommentLike struct {
	UserID    uint      `json:"user_id" gorm:"primaryKey"`
	CommentID uint      `json:"comment_id" gorm:"primaryKey"`
	IsLike    bool      `json:"is_like"` // true = like, false = dislike
	CreatedAt time.Time `json:"created_at"`
}
