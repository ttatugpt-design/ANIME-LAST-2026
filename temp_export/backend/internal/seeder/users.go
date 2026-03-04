package seeder

import (
	"backend/internal/core/domain"
	"log"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func SeedUsers(db *gorm.DB) {
	// Create Roles
	adminRole := domain.Role{Name: "admin"}
	db.Where("name = ?", "admin").FirstOrCreate(&adminRole)

	userRole := domain.Role{Name: "User"}
	db.Where("name = ?", "User").FirstOrCreate(&userRole)

	// Create User
	email := "aaaa@gmail.com"
	password := "aaaa@gmail.com"

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Failed to hash password: %v", err)
		return
	}

	user := domain.User{
		Name:     "عبدالرحمن محمد حسن",
		Email:    email,
		Password: string(hashedPassword),
		RoleID:   adminRole.ID,
	}

	if err := db.Where("email = ?", email).First(&domain.User{}).Error; err == gorm.ErrRecordNotFound {
		db.Create(&user)
		log.Printf("Admin user created: %s / %s", email, password)
	} else {
		// Update user to ensure role is assigned
		var existingUser domain.User
		db.Where("email = ?", email).First(&existingUser)
		existingUser.RoleID = adminRole.ID
		existingUser.Password = string(hashedPassword) // Reset password to ensure it matches
		db.Save(&existingUser)
		log.Printf("Admin user already exists (updated): %s", email)
	}
}
