package domain

import "time"

type Report struct {
	ID            int64     `json:"id" db:"id"`
	ProblemType   string    `json:"problem_type" db:"problem_type"`
	Description   string    `json:"description" db:"description"`
	EpisodeNumber string    `json:"episode_number" db:"episode_number"`
	EpisodeLink   string    `json:"episode_link" db:"episode_link"`
	ServerName    string    `json:"server_name" db:"server_name"`
	PageType      string    `json:"page_type" db:"page_type"` // "ar" or "en"
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}
