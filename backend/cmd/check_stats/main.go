package main

import (
	"fmt"
	"log"
	"time" // Added for time.Time in Comment struct

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Comment struct {
	ID        uint
	Content   string
	EpisodeID uint
	ParentID  *uint
	CreatedAt time.Time
}

func (Comment) TableName() string { return "comments" }

// Define domain models for GORM to interact with tables
// These are assumed to exist in a 'domain' package or similar
// For this script, we'll define them here to make it self-contained
type User struct {
	ID   uint `gorm:"primaryKey"`
	Name string
	// other user fields
}

type WatchLater struct {
	ID     uint `gorm:"primaryKey"`
	UserID uint
}

func (WatchLater) TableName() string { return "watch_later" }

type History struct {
	ID     uint `gorm:"primaryKey"`
	UserID uint
}

func (History) TableName() string { return "histories" }

type Notification struct {
	ID     uint `gorm:"primaryKey"`
	UserID uint
	IsRead bool
}

func (Notification) TableName() string { return "notifications" }

func main() {
	db, err := gorm.Open(sqlite.Open("cmd/server/saas.db"), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var allNotifs []Notification
	db.Find(&allNotifs)
	fmt.Printf("\nALL NOTIFICATIONS IN DB:\n")
	for _, n := range allNotifs {
		fmt.Printf("ID: %d, UserID: %d, IsRead: %v\n", n.ID, n.UserID, n.IsRead)
	}

	var orphanNotifs, orphanHist, orphanWatch int64
	db.Model(&Notification{}).Where("user_id = 0 OR user_id NOT IN (SELECT id FROM users)").Count(&orphanNotifs)
	db.Model(&History{}).Where("user_id = 0 OR user_id NOT IN (SELECT id FROM users)").Count(&orphanHist)
	db.Model(&WatchLater{}).Where("user_id = 0 OR user_id NOT IN (SELECT id FROM users)").Count(&orphanWatch)
	fmt.Printf("\nORPHAN RECORDS (user_id=0 or invalid):\nNotifications: %d, Histories: %d, Watch Later: %d\n\n", orphanNotifs, orphanHist, orphanWatch)

	var totalNotifs, totalHist, totalWatch int64
	db.Model(&Notification{}).Count(&totalNotifs)
	db.Model(&History{}).Count(&totalHist)
	db.Model(&WatchLater{}).Count(&totalWatch)
	fmt.Printf("\nRAW DATABASE TOTALS:\nNotifications: %d, Histories: %d, Watch Later: %d\n\n", totalNotifs, totalHist, totalWatch)

	var tables []string
	db.Raw("SELECT name FROM sqlite_master WHERE type='table'").Scan(&tables)
	fmt.Printf("Tables in DB: %v\n", tables)

	var users []User // Use the local User struct
	db.Find(&users)
	fmt.Printf("Total users: %d\n", len(users))

	for _, u := range users {
		var notifCount int64
		db.Model(&Notification{}).Where("user_id = ? AND is_read = ?", u.ID, false).Count(&notifCount)

		var historyCount int64
		db.Model(&History{}).Where("user_id = ?", u.ID).Count(&historyCount)

		var watchLaterCount int64
		db.Model(&WatchLater{}).Where("user_id = ?", u.ID).Count(&watchLaterCount)

		fmt.Printf("User: %s (ID: %d) -> Notifications: %d, History: %d, Watch Later: %d\n", u.Name, u.ID, notifCount, historyCount, watchLaterCount)
	}

	var comms []Comment
	db.Order("created_at desc").Limit(10).Find(&comms)
	fmt.Println("\nLATEST 10 COMMENTS IN DB:")
	for _, c := range comms {
		fmt.Printf("ID: %d, Content: %s, Created: %v, EpisodeID: %d, Parent: %v\n",
			c.ID, c.Content, c.CreatedAt, c.EpisodeID, c.ParentID)
	}
}
