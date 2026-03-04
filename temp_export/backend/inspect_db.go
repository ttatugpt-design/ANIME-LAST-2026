package main

import (
	"fmt"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Anime struct {
	ID      uint
	Title   string
	TitleEn string
	Slug    string
	SlugEn  string
}

func main() {
	db, err := gorm.Open(sqlite.Open("saas.db"), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var animes []Anime
	db.Table("animes").Find(&animes)

	fmt.Println("ID | Title | TitleEn | Slug | SlugEn")
	fmt.Println("---|---|---|---|---")
	for _, a := range animes {
		fmt.Printf("%d | %s | %s | %s | %s\n", a.ID, a.Title, a.TitleEn, a.Slug, a.SlugEn)
	}
}
