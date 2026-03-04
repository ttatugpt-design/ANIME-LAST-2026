package migration

import (
	"log"

	"gorm.io/gorm"
)

// CleanLocalhostURLs removes http://localhost:8080 from all image columns in the database
// This is a one-time migration to clean legacy data
func CleanLocalhostURLs(db *gorm.DB) error {
	log.Println("Running database cleanup: removing localhost:8080 URLs...")

	// Clean animes table
	result := db.Exec(`UPDATE animes SET image = REPLACE(image, 'http://localhost:8080', '') WHERE image LIKE '%localhost:8080%'`)
	if result.Error != nil {
		return result.Error
	}
	log.Printf("Cleaned %d anime images", result.RowsAffected)

	result = db.Exec(`UPDATE animes SET cover = REPLACE(cover, 'http://localhost:8080', '') WHERE cover LIKE '%localhost:8080%'`)
	if result.Error != nil {
		return result.Error
	}
	log.Printf("Cleaned %d anime covers", result.RowsAffected)

	// Clean episodes table
	result = db.Exec(`UPDATE episodes SET thumbnail = REPLACE(thumbnail, 'http://localhost:8080', '') WHERE thumbnail LIKE '%localhost:8080%'`)
	if result.Error != nil {
		return result.Error
	}
	log.Printf("Cleaned %d episode thumbnails", result.RowsAffected)

	result = db.Exec(`UPDATE episodes SET banner = REPLACE(banner, 'http://localhost:8080', '') WHERE banner LIKE '%localhost:8080%'`)
	if result.Error != nil {
		return result.Error
	}
	log.Printf("Cleaned %d episode banners", result.RowsAffected)

	// Clean users table (avatars)
	result = db.Exec(`UPDATE users SET avatar = REPLACE(avatar, 'http://localhost:8080', '') WHERE avatar LIKE '%localhost:8080%'`)
	if result.Error != nil {
		return result.Error
	}
	log.Printf("Cleaned %d user avatars", result.RowsAffected)

	// Clean models table
	result = db.Exec(`UPDATE models SET preview = REPLACE(preview, 'http://localhost:8080', '') WHERE preview LIKE '%localhost:8080%'`)
	if result.Error != nil {
		return result.Error
	}
	log.Printf("Cleaned %d model previews", result.RowsAffected)

	log.Println("Database cleanup completed successfully!")
	return nil
}
