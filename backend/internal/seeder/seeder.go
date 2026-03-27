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
	SeedCountries(db)
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
	SeedSpyXFamily(db)
	SeedSteinsGate(db)
	SeedKingdom6th(db)
	SeedBakiDou2026(db)
	SeedOedoFireSlayer(db)
	SeedSpyXFamilyS3(db)
	SeedJujutsuKaisen0(db)
	SeedJujutsuKaisenS3(db)
	SeedReZeroS3(db)
	SeedAdventurerAge29(db)
	SeedToBeHeroX(db)
	SeedBerserkManga(db)
	SeedNewsAnimes(db)

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
