package migration

import (
	"log"

	"gorm.io/gorm"
)

// CreateReportsTable creates the reports table for user issue reporting
func CreateReportsTable(db *gorm.DB) error {
	log.Println("Creating reports table...")

	// Create reports table
	result := db.Exec(`
		CREATE TABLE IF NOT EXISTS reports (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			problem_type TEXT NOT NULL,
			description TEXT NOT NULL,
			episode_number TEXT NOT NULL,
			episode_link TEXT NOT NULL,
			server_name TEXT NOT NULL,
			page_type TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	if result.Error != nil {
		return result.Error
	}

	log.Println("Reports table created successfully!")
	return nil
}
