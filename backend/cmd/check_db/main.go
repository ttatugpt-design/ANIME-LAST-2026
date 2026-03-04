package main

import (
	"fmt"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Category struct {
	ID     uint `gorm:"primaryKey"`
	Name   string
	NameEn string
	Slug   string
}

type Type struct {
	ID     uint `gorm:"primaryKey"`
	Name   string
	NameEn string
	Slug   string
}

type Anime struct {
	ID      uint `gorm:"primaryKey"`
	Title   string
	TitleEn string
	Slug    string
	SlugEn  string
}

type Episode struct {
	ID            uint `gorm:"primaryKey"`
	AnimeID       uint
	EpisodeNumber int
	Title         string
	Slug          string
}

func main() {
	// Open database
	db, err := gorm.Open(sqlite.Open("../server/saas.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}

	// Check Categories
	var catCount int64
	db.Model(&Category{}).Count(&catCount)
	fmt.Printf("Categories count: %d\n", catCount)

	var cats []Category
	db.Limit(3).Find(&cats)
	fmt.Println("\nFirst 3 Categories:")
	for _, c := range cats {
		fmt.Printf("  ID: %d, Name: %s, NameEn: %s, Slug: %s\n", c.ID, c.Name, c.NameEn, c.Slug)
	}

	// Check Types
	var typeCount int64
	db.Model(&Type{}).Count(&typeCount)
	fmt.Printf("\nTypes count: %d\n", typeCount)

	var types []Type
	db.Limit(3).Find(&types)
	fmt.Println("\nFirst 3 Types:")
	for _, t := range types {
		fmt.Printf("  ID: %d, Name: %s, NameEn: %s, Slug: %s\n", t.ID, t.Name, t.NameEn, t.Slug)
	}

	// Check Animes
	var animeCount int64
	db.Model(&Anime{}).Count(&animeCount)
	fmt.Printf("\nAnimes count: %d\n", animeCount)

	var animes []Anime
	db.Find(&animes)
	fmt.Println("\nAll Animes:")
	for _, a := range animes {
		fmt.Printf("  ID: %d, Title: %s, TitleEn: %s, Slug: %s\n", a.ID, a.Title, a.TitleEn, a.Slug)
	}

	// Check Episodes
	var episodeCount int64
	db.Model(&Episode{}).Count(&episodeCount)
	fmt.Printf("\nEpisodes count: %d\n", episodeCount)

	var episodes []Episode
	db.Limit(10).Find(&episodes)
	fmt.Println("\nFirst 10 Episodes:")
	for _, e := range episodes {
		fmt.Printf("  ID: %d, AnimeID: %d, Ep: %d, Title: %s, Slug: %s\n", e.ID, e.AnimeID, e.EpisodeNumber, e.Title, e.Slug)
	}

	// Find animes with spaces in slugs
	var malformedAnimes []Anime
	db.Where("slug LIKE '% %' OR slug_en LIKE '% %' OR slug LIKE '%_%'").Find(&malformedAnimes)
	fmt.Printf("\nAnimes with malformed slugs (spaces or underscores): %d\n", len(malformedAnimes))
	for _, a := range malformedAnimes {
		fmt.Printf("  ID: %d, Title: %s, Slug: '%s', SlugEn: '%s'\n", a.ID, a.Title, a.Slug, a.SlugEn)
	}

	// Find episodes with spaces in slugs
	var malformedEpisodes []Episode
	db.Where("slug LIKE '% %'").Find(&malformedEpisodes)
	fmt.Printf("\nEpisodes with spaces in slugs: %d\n", len(malformedEpisodes))
	for _, e := range malformedEpisodes {
		fmt.Printf("  ID: %d, Title: %s, Slug: '%s'\n", e.ID, e.Title, e.Slug)
	}

	// Search for Jujutsu in episodes
	var jujutsuEpisodes []Episode
	db.Where("title LIKE ? OR slug LIKE ?", "%Jujutsu%", "%Jujutsu%").Find(&jujutsuEpisodes)
	if len(jujutsuEpisodes) > 0 {
		fmt.Println("\nJujutsu Episodes Found:")
		for _, e := range jujutsuEpisodes {
			fmt.Printf("  ID: %d, Title: %s, Slug: '%s'\n", e.ID, e.Title, e.Slug)
		}
	} else {
		fmt.Println("\nNo Jujutsu episodes found.")
	}

	// Check table schema
	fmt.Println("\n=== Episodes Table Columns ===")
	var columns []struct {
		Name string
		Type string
	}
	db.Raw("PRAGMA table_info(episodes)").Scan(&columns)
	for _, col := range columns {
		fmt.Printf("  %s (%s)\n", col.Name, col.Type)
	}
}
