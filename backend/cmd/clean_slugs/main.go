package main

import (
	"fmt"
	"log"
	"strings"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Anime struct {
	ID     uint `gorm:"primaryKey"`
	Title  string
	Slug   string
	SlugEn string
}

type Episode struct {
	ID     uint `gorm:"primaryKey"`
	Title  string
	Slug   string
	SlugEn string
}

func sanitizeSlug(slug string) string {
	s := strings.ToLower(slug)
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, "_", "-")
	// Replace multiple hyphens with one
	for strings.Contains(s, "--") {
		s = strings.ReplaceAll(s, "--", "-")
	}
	return strings.Trim(s, "-")
}

func main() {
	// Open database - pointing to the active server DB
	db, err := gorm.Open(sqlite.Open("../server/saas.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}

	fmt.Println("=== Starting Slug Standardization ===")

	// 1. Clean Animes
	var animes []Anime
	db.Find(&animes)
	fmt.Printf("Processing %d animes...\n", len(animes))
	for _, a := range animes {
		newSlug := sanitizeSlug(a.Slug)
		newSlugEn := sanitizeSlug(a.SlugEn)

		if newSlug != a.Slug || newSlugEn != a.SlugEn {
			fmt.Printf("Updating Anime %d: '%s' -> '%s' (SlugEn: '%s' -> '%s')\n", a.ID, a.Slug, newSlug, a.SlugEn, newSlugEn)
			db.Model(&a).Updates(map[string]interface{}{
				"slug":    newSlug,
				"slug_en": newSlugEn,
			})
		}
	}

	// 2. Clean Episodes
	var episodes []Episode
	db.Find(&episodes)
	fmt.Printf("\nProcessing %d episodes...\n", len(episodes))
	count := 0
	for _, e := range episodes {
		newSlug := sanitizeSlug(e.Slug)
		newSlugEn := sanitizeSlug(e.SlugEn)

		if (e.Slug != "" && newSlug != e.Slug) || (e.SlugEn != "" && newSlugEn != e.SlugEn) {
			count++
			if count < 20 { // Log first few
				fmt.Printf("Updating Episode %d: '%s' -> '%s'\n", e.ID, e.Slug, newSlug)
			}
			db.Model(&e).Updates(map[string]interface{}{
				"slug":    newSlug,
				"slug_en": newSlugEn,
			})
		}
	}
	fmt.Printf("Updated %d episodes total.\n", count)

	fmt.Println("\n=== Slug Standardization Complete ===")
}
