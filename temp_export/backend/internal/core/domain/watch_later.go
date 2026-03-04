package domain

import "time"

type WatchLater struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"not null"`
	AnimeID   *uint     `json:"anime_id,omitempty"`
	EpisodeID *uint     `json:"episode_id,omitempty"`
	Anime     *Anime    `json:"anime,omitempty" gorm:"foreignKey:AnimeID"`
	Episode   *Episode  `json:"episode,omitempty" gorm:"foreignKey:EpisodeID"`
	CreatedAt time.Time `json:"created_at"`
}

func (WatchLater) TableName() string {
	return "watch_later"
}
