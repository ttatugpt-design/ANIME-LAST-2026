package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	DBUrl        string
	JWTSecret    string
	RTSecret     string // Refresh Token Secret
	AllowOrigins string
	MeshyAPIKey  string
	// Blender Export Configuration
	BlenderPath   string
	ExportTimeout int
	ExportDir     string
	BackupDir     string
}

func LoadConfig() (*Config, error) {
	// Load .env file if exists
	err := godotenv.Load()
	if err != nil {
		// Try loading from root if running from cmd/server
		err = godotenv.Load("../../.env")
		if err != nil {
			fmt.Printf("Error loading .env file: %v\n", err)
		} else {
			fmt.Println(".env file loaded successfully from ../../.env")
		}
	} else {
		fmt.Println(".env file loaded successfully")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		// Use a standard relative path that works well in both dev and prod
		dbUrl = "saas.db"
		fmt.Printf("Defaulting database to relative path: %s\n", dbUrl)
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super-secret-key-change-me"
	}

	rtSecret := os.Getenv("REFRESH_TOKEN_SECRET")
	if rtSecret == "" {
		rtSecret = "super-secret-refresh-key-change-me"
	}

	allowOrigins := os.Getenv("ALLOW_ORIGINS")
	if allowOrigins == "" {
		allowOrigins = "http://localhost:5173,http://localhost:3000,http://192.168.0.105:3000"
	}

	meshyKey := os.Getenv("MESHY_API_KEY")
	if meshyKey == "" {
		fmt.Println("Warning: MESHY_API_KEY not found in environment")
	} else {
		fmt.Printf("MESHY_API_KEY found (length: %d)\n", len(meshyKey))
	}

	// Blender configuration
	blenderPath := os.Getenv("BLENDER_PATH")
	if blenderPath == "" {
		blenderPath = "blender" // Try system PATH
		fmt.Println("Warning: BLENDER_PATH not set, using 'blender' from PATH")
	}

	exportTimeout := 300 // Default 5 minutes
	if timeoutStr := os.Getenv("EXPORT_TIMEOUT"); timeoutStr != "" {
		fmt.Sscanf(timeoutStr, "%d", &exportTimeout)
	}

	exportDir := os.Getenv("EXPORT_DIR")
	if exportDir == "" {
		exportDir = "uploads/exports"
	}

	backupDir := os.Getenv("BACKUP_DIR")
	if backupDir == "" {
		backupDir = "uploads/backups"
	}

	return &Config{
		Port:          port,
		DBUrl:         dbUrl,
		JWTSecret:     jwtSecret,
		RTSecret:      rtSecret,
		AllowOrigins:  allowOrigins,
		MeshyAPIKey:   meshyKey,
		BlenderPath:   blenderPath,
		ExportTimeout: exportTimeout,
		ExportDir:     exportDir,
		BackupDir:     backupDir,
	}, nil
}
