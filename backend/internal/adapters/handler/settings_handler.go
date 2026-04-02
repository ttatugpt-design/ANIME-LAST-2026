package handler

import (
	"backend/internal/core/domain"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SettingsHandler struct {
	db *gorm.DB
}

func NewSettingsHandler(db *gorm.DB) *SettingsHandler {
	return &SettingsHandler{db: db}
}

// GetSettings fetches the global settings. Create defaults if not exist.
func (h *SettingsHandler) GetSettings(c *gin.Context) {
	var settings domain.Settings
	err := h.db.First(&settings).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create default settings
			settings = domain.Settings{
				AppName:           "SaaS Platform",
				FakeNamingActive:  false,
				FakeNamingPrefix:  "ab",
				FakeNamingCounter: 1,
			}
			h.db.Create(&settings)
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
			return
		}
	}
	c.JSON(http.StatusOK, settings)
}

// UpdateSettings updates the global settings
func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	fmt.Println("SettingsHandler: UpdateSettings called")
	var settings domain.Settings
	result := h.db.First(&settings)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			fmt.Println("SettingsHandler: Settings not found, creating new")
			settings = domain.Settings{AppName: "SaaS Platform"}
			if err := h.db.Create(&settings).Error; err != nil {
				fmt.Printf("SettingsHandler: Error creating settings: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create settings"})
				return
			}
		} else {
			fmt.Printf("SettingsHandler: Error fetching settings: %v\n", result.Error)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
			return
		}
	}

	// Update App Name
	appName := c.PostForm("app_name")
	fmt.Printf("SettingsHandler: Recieved app_name: %s\n", appName)
	if appName != "" {
		settings.AppName = appName
	}

	// Handle Logo Upload
	file, err := c.FormFile("logo")
	if err == nil {
		fmt.Printf("SettingsHandler: Recieved logo file: %s\n", file.Filename)
		// Define upload directory
		uploadDir := "./uploads/settings"
		if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
			os.MkdirAll(uploadDir, os.ModePerm)
		}

		// Generate unique filename
		ext := filepath.Ext(file.Filename)
		newFilename := fmt.Sprintf("logo_%s%s", uuid.New().String(), ext)
		destPath := filepath.Join(uploadDir, newFilename)

		// Save the file
		if err := c.SaveUploadedFile(file, destPath); err != nil {
			fmt.Printf("SettingsHandler: Error saving file: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save logo"})
			return
		}

		// Remove old logo if exists (optional, good for cleanup)
		if settings.Logo != "" {
			oldPath := "." + settings.Logo // Assuming stored path starts with /uploads
			os.Remove(oldPath)
		}

		// Update path in DB (relative to root, serving static)
		settings.Logo = "/uploads/settings/" + newFilename
		fmt.Printf("SettingsHandler: Logo saved to: %s\n", settings.Logo)
	} else if err != http.ErrMissingFile {
		fmt.Printf("SettingsHandler: Error retrieving logo file: %v\n", err)
	}

	// Update Fake Naming Settings
	fakeActive := c.PostForm("fake_naming_active")
	if fakeActive != "" {
		settings.FakeNamingActive = fakeActive == "true" || fakeActive == "1"
	}
	fakePrefix := c.PostForm("fake_naming_prefix")
	if fakePrefix != "" {
		settings.FakeNamingPrefix = fakePrefix
	}
	fakeCounter := c.PostForm("fake_naming_counter")
	if fakeCounter != "" {
		if val, err := strconv.Atoi(fakeCounter); err == nil {
			settings.FakeNamingCounter = val
		}
	}

	settings.UpdatedAt = time.Now()
	if err := h.db.Save(&settings).Error; err != nil {
		fmt.Printf("SettingsHandler: Error saving db record: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings in DB"})
		return
	}

	fmt.Println("SettingsHandler: Update success")
	c.JSON(http.StatusOK, settings)
}
