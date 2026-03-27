package main

import (
	"backend/config"
	"backend/internal/adapters/repository"
	"log"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	repo, err := repository.NewSQLiteRepository(cfg.DBUrl)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	db := repo.DB()

	slugs := []string{
		"oedo-fire-slayer",
		"spy-x-family-s3",
		"jujutsu-kaisen-0",
		"re-zero-s3",
		"adventurer-daily-grind-age-29",
		"to-be-hero-x",
		"baki-dou-2026",
	}

	// Update animes
	result := db.Exec("UPDATE animes SET is_published = 0 WHERE slug IN ?", slugs)
	log.Printf("Animes updated: %d rows", result.RowsAffected)

	// Update episodes
	result = db.Exec(`
		UPDATE episodes SET is_published = 0 
		WHERE anime_id IN (SELECT id FROM animes WHERE slug IN ?)`, slugs)
	log.Printf("Episodes updated: %d rows", result.RowsAffected)

	log.Println("Done! All episodes and animes are now unpublished.")
}
