package config
// Triggering new build to clear Railway cache

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	Host         string
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
	// Resolve base directory (current working directory)
	cwd, err := os.Getwd()
	if err != nil {
		fmt.Printf("Warning: Failed to get current working directory: %v\n", err)
		cwd = "."
	}

	// Determine if we are in the backend subdirectory or root (Logic from main.go)
	baseDir := cwd
	if filepath.Base(cwd) == "server" && strings.Contains(cwd, filepath.Join("backend", "cmd", "server")) {
		// We are in backend/cmd/server, root is 3 levels up
		baseDir = filepath.Dir(filepath.Dir(filepath.Dir(cwd)))
	} else if filepath.Base(cwd) == "backend" {
		// We are in backend/, root is 1 level up
		baseDir = filepath.Dir(cwd)
	}
	fmt.Printf("Config: Project base directory resolved to: %s\n", baseDir)

	// Load .env file
	_ = godotenv.Load() // Optional from current dir
	_ = godotenv.Load(filepath.Join(baseDir, "backend", ".env"))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	host := os.Getenv("SERVER_HOST")
	if host == "" {
		host = "0.0.0.0"
	}

	// ─── DATABASE CONFIGURATION ──────────────────────────────────────────────
	// The user explicitly wants everything in backend/cmd/server/saas.db
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		// Use absolute path to avoid ambiguity in Docker/Railway
		dbUrl = filepath.Join(baseDir, "backend", "cmd", "server", "saas.db")
		fmt.Printf("Config: Database forced to absolute path: %s\n", dbUrl)
	} else if !filepath.IsAbs(dbUrl) {
		// If relative, make it absolute relative to baseDir
		dbUrl = filepath.Join(baseDir, dbUrl)
		fmt.Printf("Config: Database relative path resolved to: %s\n", dbUrl)
	}

	// Ensure the directory for the database exists
	dbDir := filepath.Dir(dbUrl)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		fmt.Printf("Warning: Failed to create database directory %s: %v\n", dbDir, err)
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

	// Blender configuration
	blenderPath := os.Getenv("BLENDER_PATH")
	if blenderPath == "" {
		blenderPath = "blender"
	}

	exportTimeout := 300 // Default 5 minutes
	if timeoutStr := os.Getenv("EXPORT_TIMEOUT"); timeoutStr != "" {
		fmt.Sscanf(timeoutStr, "%d", &exportTimeout)
	}

	// ─── DIRECTORY CONFIGURATION ─────────────────────────────────────────────
	exportDir := os.Getenv("EXPORT_DIR")
	if exportDir == "" {
		exportDir = filepath.Join(baseDir, "backend", "uploads", "exports")
	} else if !filepath.IsAbs(exportDir) {
		exportDir = filepath.Join(baseDir, exportDir)
	}

	backupDir := os.Getenv("BACKUP_DIR")
	if backupDir == "" {
		backupDir = filepath.Join(baseDir, "backend", "uploads", "backups")
	} else if !filepath.IsAbs(backupDir) {
		backupDir = filepath.Join(baseDir, backupDir)
	}

	// Ensure directories exist
	os.MkdirAll(exportDir, 0755)
	os.MkdirAll(backupDir, 0755)

	return &Config{
		Port:          port,
		Host:          host,
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
