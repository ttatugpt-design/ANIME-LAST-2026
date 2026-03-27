package domain

import (
	"time"

	"gorm.io/gorm"
)

type Chapter struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
	AnimeID       uint           `json:"anime_id"`
	Anime         Anime          `json:"anime" gorm:"foreignKey:AnimeID"`
	Title         string          `json:"title"`
	TitleEn       string          `json:"title_en"`
	Slug          string          `json:"slug"`
	SlugEn        string          `json:"slug_en"`
	ChapterNumber int             `json:"chapter_number"`
	Images        string          `json:"images"` // JSON string: ["url1", "url2", ...]
	IsPublished   bool            `json:"is_published"`
	ViewsCount    int             `json:"views_count" gorm:"default:0"`
}
