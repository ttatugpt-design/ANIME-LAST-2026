package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	// Open database
	db, err := sql.Open("sqlite3", "../../data.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Check table structure
	fmt.Println("Checking histories table structure:")
	rows, err := db.Query("PRAGMA table_info(histories)")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("\nColumns:")
	hasMetadata := false
	for rows.Next() {
		var cid int
		var name string
		var dtype string
		var notnull int
		var dflt interface{}
		var pk int

		err = rows.Scan(&cid, &name, &dtype, &notnull, &dflt, &pk)
		if err != nil {
			log.Fatal(err)
		}
		fmt.Printf("  %d: %s (%s)\n", cid, name, dtype)
		if name == "metadata" {
			hasMetadata = true
		}
	}

	if !hasMetadata {
		fmt.Println("\n⚠️  WARNING: 'metadata' column NOT found!")
		fmt.Println("Adding metadata column...")

		_, err = db.Exec("ALTER TABLE histories ADD COLUMN metadata TEXT")
		if err != nil {
			log.Fatal("Failed to add metadata column:", err)
		}
		fmt.Println("✅ metadata column added successfully!")
	} else {
		fmt.Println("\n✅ 'metadata' column exists!")
	}

	// Check recent history entries
	fmt.Println("\nRecent history entries:")
	historyRows, err := db.Query(`
		SELECT id, user_id, activity_type, episode_id, anime_id, comment_id, metadata, created_at 
		FROM histories 
		ORDER BY created_at DESC 
		LIMIT 5
	`)
	if err != nil {
		log.Fatal(err)
	}
	defer historyRows.Close()

	for historyRows.Next() {
		var id, userID int
		var activityType string
		var episodeID, animeID, commentID sql.NullInt64
		var metadata sql.NullString
		var createdAt string

		err = historyRows.Scan(&id, &userID, &activityType, &episodeID, &animeID, &commentID, &metadata, &createdAt)
		if err != nil {
			log.Fatal(err)
		}

		fmt.Printf("\n  ID: %d | Type: %s | User: %d\n", id, activityType, userID)
		if episodeID.Valid {
			fmt.Printf("    Episode ID: %d\n", episodeID.Int64)
		}
		if commentID.Valid {
			fmt.Printf("    Comment ID: %d\n", commentID.Int64)
		}
		if metadata.Valid && metadata.String != "" {
			fmt.Printf("    Metadata: %s\n", metadata.String)
		}
		fmt.Printf("    Created: %s\n", createdAt)
	}
}
