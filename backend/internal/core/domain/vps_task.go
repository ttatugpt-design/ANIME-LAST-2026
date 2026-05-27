package domain

import (
	"time"
)

type VPSTask struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	AnimeName    string    `json:"anime_name"`
	Type         string    `json:"type"` // "download", "upload"
	Status       string    `json:"status"` // "pending", "processing", "completed", "failed"
	Progress     float64   `json:"progress"`
	Links        string    `json:"links" gorm:"type:text"` // JSON string of links
	Error        string    `json:"error"`
	RetryCount   int       `json:"retry_count"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
