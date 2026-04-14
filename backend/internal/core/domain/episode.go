package domain

import (
	"time"

	"gorm.io/gorm"
)

type Episode struct {
	ID            uint            `gorm:"primaryKey" json:"id"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
	DeletedAt     gorm.DeletedAt  `gorm:"index" json:"-"`
	AnimeID       uint            `json:"anime_id"`
	Anime         Anime           `json:"anime" gorm:"foreignKey:AnimeID"`
	Title         string          `json:"title"`
	TitleEn       string          `json:"title_en"`
	Slug          string          `json:"slug"`
	SlugEn        string          `json:"slug_en"`
	EpisodeNumber int             `json:"episode_number"`
	Description   string          `json:"description"`
	DescriptionEn string          `json:"description_en"`
	Thumbnail     string          `json:"thumbnail"`
	Banner        string          `json:"banner"`
	VideoURLs     string          `json:"video_urls"` // JSON string: [{url, type, name}]
	Duration      int             `json:"duration"`
	Quality       string          `json:"quality"`
	VideoFormat   string          `json:"video_format"`
	ReleaseDate   time.Time       `json:"release_date"`
	IsPublished   bool            `json:"is_published"`
	Language      string          `json:"language"`
	Rating        float64         `json:"rating"`
	ViewsCount    int             `json:"views_count" gorm:"default:0"`
	LikesCount    int             `json:"likes_count" gorm:"default:0"`
	LovesCount    int             `json:"loves_count" gorm:"default:0"`
	HahasCount    int             `json:"hahas_count" gorm:"default:0"`
	WowsCount     int             `json:"wows_count" gorm:"default:0"`
	SadsCount     int             `json:"sads_count" gorm:"default:0"`
	AngrysCount   int             `json:"angrys_count" gorm:"default:0"`
	SuperSadsCount int            `json:"super_sads_count" gorm:"default:0"`
	DislikesCount int             `json:"dislikes_count" gorm:"default:0"`
	SourceURL     string          `json:"source_url"` // الرابط الخاص بالحلقة من نفس الموقع
	Servers       []EpisodeServer `json:"servers" gorm:"foreignKey:EpisodeID"`
}

// EpisodeLike represents a user's reaction (like, love, etc.) to an episode
type EpisodeLike struct {
	UserID    uint   `json:"user_id" gorm:"primaryKey"`
	EpisodeID uint   `json:"episode_id" gorm:"primaryKey"`
	Type      string `json:"type" gorm:"not null;default:'like'"` // like, love, haha, wow, sad, angry, super_sad
}

type EpisodeServer struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	EpisodeID uint           `json:"episode_id"`
	Language  string         `json:"language"` // 'ar', 'en', etc.
	Name      string         `json:"name"`     // Server Name (e.g. 'Main', '4Shared')
	URL       string         `json:"url"`      // The video URL/Embed
	Type      string         `json:"type"`     // 'embed', 'direct', etc. (optional)
}
