package main

import (
	"backend/config"
	"backend/internal/adapters/repository"
	"backend/internal/seeder"
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

	seeder.SeedAll(repo.DB())
}
