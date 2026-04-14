package main

import (
    "fmt"
    "log"
    "ttatugpt-design/ANIME-LAST-2026/backend/internal/core/domain"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
)

func main() {
    db, err := gorm.Open(sqlite.Open("../data/anime.db"), &gorm.Config{})
    if err != nil { log.Fatal(err) }

    var servers []domain.EpisodeServer
    db.Order("id desc").Limit(10).Find(&servers)
    
    for _, s := range servers {
        fmt.Printf("ID: %d | URL: %s\n", s.ID, s.URL)
    }
}
