package domain

import "time"

// ExportResult represents the result of an animation export operation
type ExportResult struct {
	Filename    string    `json:"filename"`
	FilePath    string    `json:"-"` // Don't expose internal path
	FileSize    int64     `json:"file_size"`
	DownloadURL string    `json:"download_url"`
	CreatedAt   time.Time `json:"created_at"`
}
