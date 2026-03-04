package main

import (
	"backend/internal/core/domain"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	db, err := gorm.Open(sqlite.Open("saas.db"), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Running force migration...")
	err = db.AutoMigrate(
		&domain.User{}, &domain.Role{}, &domain.Permission{},
		&domain.Model{}, &domain.Category{}, &domain.Type{},
		&domain.Season{}, &domain.Studio{}, &domain.Language{},
		&domain.Anime{}, &domain.Episode{}, &domain.EpisodeServer{}, &domain.EpisodeLike{},
		&domain.Comment{}, &domain.CommentLike{}, &domain.Notification{},
		&domain.WatchLater{}, &domain.History{},
	)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Migration completed.")
}
