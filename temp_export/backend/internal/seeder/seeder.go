package seeder

import (
	"log"
	"time"

	"gorm.io/gorm"
)

// SeedAll runs all individual seeders
func SeedAll(db *gorm.DB) {
	log.Println("Starting seeding...")

	// Dictionaries
	SeedUsers(db)
	SeedCategories(db)
	SeedTypes(db)
	SeedStudios(db)
	SeedLanguages(db)
	SeedSeasons(db)

	// Animes & Episodes
	// Old Animes
	SeedDeathNote(db)
	SeedNaruto(db)
	SeedNarutoShippuden(db)
	SeedOnePiece(db)
	SeedShingeki(db)

	// New Animes
	SeedChainsawMan(db)
	SeedFullmetalAlchemist(db)
	SeedOnePunchMan(db)
	SeedSousouNoFrieren(db)
	SeedSpyXFamily(db)
	SeedSteinsGate(db)
	SeedKingdom6th(db)

	log.Println("Seeding completed successfully.")
}

// Helpers

func toDatePtr(layout, value string) *time.Time {
	t, err := time.Parse(layout, value)
	if err != nil {
		return nil
	}
	return &t
}
