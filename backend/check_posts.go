package main
import (
	"fmt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)
type Post struct {
	ID     uint
	UserID uint
}
func main() {
	db, err := gorm.Open(sqlite.Open("saas.db"), &gorm.Config{})
	if err != nil { panic(err) }
	var posts []Post
	db.Find(&posts)
	for _, p := range posts {
		fmt.Printf("Post ID: %d, User ID: %d\n", p.ID, p.UserID)
	}
}
