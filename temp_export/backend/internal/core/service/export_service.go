package service

import (
	"backend/internal/core/domain"
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type ExportService struct {
	blenderPath   string
	exportDir     string
	exportTimeout int // in seconds
}

func NewExportService(blenderPath, exportDir string, timeout int) *ExportService {
	return &ExportService{
		blenderPath:   blenderPath,
		exportDir:     exportDir,
		exportTimeout: timeout,
	}
}

// RetargetAndExport performs animation retargeting using Blender
func (s *ExportService) RetargetAndExport(characterFile, animationFile *multipart.FileHeader) (res *domain.ExportResult, err error) {
	// Panic Recovery to prevent server crash
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("PANIC in RetargetAndExport: %v\n", r)
			err = fmt.Errorf("internal server error: panic recovered")
		}
	}()

	fmt.Println("--- Starting Export Process ---")
	fmt.Printf("Files received: Character=%s (%d bytes), Animation=%s (%d bytes)\n",
		characterFile.Filename, characterFile.Size, animationFile.Filename, animationFile.Size)

	// 1. Validate files
	if err := s.validateFile(characterFile, "character"); err != nil {
		fmt.Printf("Validation failed: %v\n", err)
		return nil, err
	}
	if err := s.validateFile(animationFile, "animation"); err != nil {
		fmt.Printf("Validation failed: %v\n", err)
		return nil, err
	}

	// 2. Create directories
	tempDir := filepath.Join(s.exportDir, "temp")
	if err := os.MkdirAll(tempDir, os.ModePerm); err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}
	if err := os.MkdirAll(s.exportDir, os.ModePerm); err != nil {
		return nil, fmt.Errorf("failed to create export directory: %w", err)
	}

	// 3. Save uploaded files to temp
	timestamp := time.Now().Format("20060102150405")
	characterPath := filepath.Join(tempDir, fmt.Sprintf("char_%s_%s", timestamp, characterFile.Filename))
	animationPath := filepath.Join(tempDir, fmt.Sprintf("anim_%s_%s", timestamp, animationFile.Filename))

	fmt.Println("Saving temp files...")
	if err := s.saveFile(characterFile, characterPath); err != nil {
		return nil, fmt.Errorf("failed to save character file: %w", err)
	}
	defer os.Remove(characterPath) // Cleanup temp file

	if err := s.saveFile(animationFile, animationPath); err != nil {
		os.Remove(characterPath)
		return nil, fmt.Errorf("failed to save animation file: %w", err)
	}
	defer os.Remove(animationPath) // Cleanup temp file

	// 4. Prepare output path
	outputFilename := fmt.Sprintf("export_%s.fbx", timestamp)
	outputPath := filepath.Join(s.exportDir, outputFilename)

	// 5. Execute Blender script
	fmt.Println("Executing Blender...")
	if err := s.runBlenderExport(characterPath, animationPath, outputPath); err != nil {
		fmt.Printf("Blender execution failed: %v\n", err)
		return nil, err
	}

	// 6. Verify output exists
	info, err := os.Stat(outputPath)
	if err != nil {
		fmt.Println("Output file verification failed")
		return nil, fmt.Errorf("export failed: output file not created")
	}

	fmt.Printf("Export success! File: %s, Size: %d\n", outputFilename, info.Size())

	// 7. Return result
	result := &domain.ExportResult{
		Filename:    outputFilename,
		FilePath:    outputPath,
		FileSize:    info.Size(),
		DownloadURL: fmt.Sprintf("/api/export/download/%s", outputFilename),
		CreatedAt:   time.Now(),
	}

	return result, nil
}

// validateFile checks if the file is valid for export
func (s *ExportService) validateFile(file *multipart.FileHeader, fileType string) error {
	if file == nil {
		return fmt.Errorf("%s file is required", fileType)
	}

	// Check extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	validExts := map[string]bool{
		".fbx":  true,
		".bvh":  true,
		".gltf": true,
		".glb":  true,
	}

	if !validExts[ext] {
		return fmt.Errorf("invalid %s file type: %s. Allowed: FBX, BVH, GLTF, GLB", fileType, ext)
	}

	// Check size (max 1GB)
	maxSize := int64(1024 * 1024 * 1024)
	if file.Size > maxSize {
		return fmt.Errorf("%s file too large: %d bytes. Max: %d bytes", fileType, file.Size, maxSize)
	}

	return nil
}

// saveFile saves uploaded file to disk
func (s *ExportService) saveFile(file *multipart.FileHeader, destPath string) error {
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	return err
}

// runBlenderExport executes the Blender Python script
func (s *ExportService) runBlenderExport(characterPath, animationPath, outputPath string) error {
	// Debug: Print CWD
	cwd, _ := os.Getwd()
	fmt.Printf("Current Working Directory: %s\n", cwd)

	// Get script path (just for logging)
	possiblePaths := []string{
		filepath.Join("export", "export_animation.py"),
		filepath.Join("backend", "export", "export_animation.py"),
		`C:\Users\Abdo\Desktop\3D\backend\export\export_animation.py`,
	}

	var scriptPath string
	found := false
	for _, p := range possiblePaths {
		if _, err := os.Stat(p); err == nil {
			scriptPath = p
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("export script not found. CWD: %s", cwd)
	}
	fmt.Printf("Found export script at: %s\n", scriptPath)
	// Convert paths to absolute
	absScriptPath, _ := filepath.Abs(scriptPath)
	absCharacterPath, _ := filepath.Abs(characterPath)
	absAnimationPath, _ := filepath.Abs(animationPath)
	absOutputPath, _ := filepath.Abs(outputPath)

	// Context with Timeout
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(s.exportTimeout)*time.Second)
	defer cancel()

	// Build Blender command
	cmd := exec.CommandContext(ctx,
		s.blenderPath,
		"--background",
		"--python", absScriptPath,
		"--",
		"--character", absCharacterPath,
		"--animation", absAnimationPath,
		"--output", absOutputPath,
	)

	// Capture output
	fmt.Println("Running Blender command...")
	output, err := cmd.CombinedOutput()
	outputStr := string(output)

	// Log output
	fmt.Println("=== Blender Output ===")
	fmt.Println(outputStr)
	fmt.Println("=====================")

	// Check if context was done (timeout)
	if ctx.Err() == context.DeadlineExceeded {
		return fmt.Errorf("blender export timed out after %d seconds", s.exportTimeout)
	}

	// Check for errors
	if err != nil {
		errorMsg := s.parseBlenderError(outputStr, err)
		return fmt.Errorf("blender failed: %s\n\nFull Log:\n%s", errorMsg, getLastNLines(outputStr, 20))
	}

	// Check output logs for failure indications
	if strings.Contains(outputStr, "ERROR:") {
		errorMsg := s.parseBlenderError(outputStr, nil)
		return fmt.Errorf("script error: %s\n\nFull Log:\n%s", errorMsg, getLastNLines(outputStr, 20))
	}

	if !strings.Contains(outputStr, "SUCCESS:") {
		return fmt.Errorf("process finished without success.\n\nOutput content:\n%s", getLastNLines(outputStr, 20))
	}

	return nil
}

// AutoRigCharacter performs automatic rigging on a mesh
func (s *ExportService) AutoRigCharacter(characterFile *multipart.FileHeader) (res *domain.ExportResult, err error) {
	// Panic Recovery
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("internal server error: panic recovered")
		}
	}()

	fmt.Println("--- Starting Auto-Rig ---")

	// Create paths
	timestamp := time.Now().Format("20060102150405")
	tempDir := filepath.Join(s.exportDir, "temp")
	os.MkdirAll(tempDir, os.ModePerm)
	os.MkdirAll(s.exportDir, os.ModePerm)

	characterPath := filepath.Join(tempDir, fmt.Sprintf("char_%s_%s", timestamp, characterFile.Filename))
	outputFilename := fmt.Sprintf("autorig_%s.fbx", timestamp)
	outputPath := filepath.Join(s.exportDir, outputFilename)

	// Save file
	if err := s.saveFile(characterFile, characterPath); err != nil {
		return nil, err
	}
	defer os.Remove(characterPath)

	// Resolve script path
	scriptPath, err := s.resolveScriptPath("auto_rig.py")
	if err != nil {
		return nil, err
	}

	if err := s.runBlenderScript(scriptPath, characterPath, outputPath); err != nil {
		return nil, err
	}

	info, _ := os.Stat(outputPath)
	return &domain.ExportResult{
		Filename:    outputFilename,
		FilePath:    outputPath,
		FileSize:    info.Size(),
		DownloadURL: fmt.Sprintf("/api/export/download/%s", outputFilename),
		CreatedAt:   time.Now(),
	}, nil
}

// GenerateSprintAnimation adds procedural sprint animation
func (s *ExportService) GenerateSprintAnimation(characterFile *multipart.FileHeader) (res *domain.ExportResult, err error) {
	// Panic Recovery
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("internal server error: panic recovered")
		}
	}()

	fmt.Println("--- Starting Sprint Gen ---")

	timestamp := time.Now().Format("20060102150405")
	tempDir := filepath.Join(s.exportDir, "temp")
	os.MkdirAll(tempDir, os.ModePerm)
	os.MkdirAll(s.exportDir, os.ModePerm)

	characterPath := filepath.Join(tempDir, fmt.Sprintf("char_%s_%s", timestamp, characterFile.Filename))
	outputFilename := fmt.Sprintf("sprint_%s.fbx", timestamp)
	outputPath := filepath.Join(s.exportDir, outputFilename)

	if err := s.saveFile(characterFile, characterPath); err != nil {
		return nil, err
	}
	defer os.Remove(characterPath)

	// Resolve script path
	scriptPath, err := s.resolveScriptPath("generate_sprint.py")
	if err != nil {
		return nil, err
	}

	if err := s.runBlenderScript(scriptPath, characterPath, outputPath); err != nil {
		return nil, err
	}

	info, _ := os.Stat(outputPath)
	return &domain.ExportResult{
		Filename:    outputFilename,
		FilePath:    outputPath,
		FileSize:    info.Size(),
		DownloadURL: fmt.Sprintf("/api/export/download/%s", outputFilename),
		CreatedAt:   time.Now(),
	}, nil
}

// Shared helper for generic scripts
func (s *ExportService) runBlenderScript(scriptRelativePath, inputPath, outputPath string) error {
	cwd, _ := os.Getwd()

	// Check absolute path for script
	absScriptPath, _ := filepath.Abs(scriptRelativePath)
	if _, err := os.Stat(absScriptPath); err != nil {
		// Fallback to explicit path if needed (e.g. C:\Users...)
		absScriptPath = filepath.Join(cwd, scriptRelativePath)
	}

	absInput, _ := filepath.Abs(inputPath)
	absOutput, _ := filepath.Abs(outputPath)

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(s.exportTimeout)*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx,
		s.blenderPath,
		"--background",
		"--python", absScriptPath,
		"--",
		absInput,
		absOutput,
	)

	fmt.Printf("Running Script: %s\n", scriptRelativePath)
	output, err := cmd.CombinedOutput()
	outputStr := string(output)

	// Basic logging
	if len(outputStr) > 2000 {
		fmt.Println(outputStr[len(outputStr)-2000:])
	} else {
		fmt.Println(outputStr)
	}

	if ctx.Err() == context.DeadlineExceeded {
		return fmt.Errorf("timeout")
	}
	if err != nil || strings.Contains(outputStr, "ERROR:") {
		return fmt.Errorf("script failed: %v", err)
	}
	return nil
}

// GetExportFile returns the full path to an exported file
func (s *ExportService) GetExportFile(filename string) (string, error) {
	// Security check: prevent directory traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return "", fmt.Errorf("invalid filename")
	}

	path := filepath.Join(s.exportDir, filename)
	if _, err := os.Stat(path); err != nil {
		return "", err
	}
	return path, nil
}

// getLastNLines returns the last N lines of a string
func getLastNLines(s string, n int) string {
	lines := strings.Split(s, "\n")
	if len(lines) <= n {
		return s
	}
	return strings.Join(lines[len(lines)-n:], "\n")
}

// parseBlenderError extracts meaningful error message from Blender output
func (s *ExportService) parseBlenderError(output string, execErr error) string {
	lines := strings.Split(output, "\n")

	// Look for ERROR: lines
	for _, line := range lines {
		if strings.Contains(line, "ERROR:") {
			return strings.TrimSpace(strings.TrimPrefix(line, "ERROR:"))
		}
	}

	// Check for common error patterns
	if strings.Contains(output, "no armature") || strings.Contains(output, "no skeleton") {
		return "The uploaded file does not contain a valid skeleton/armature. Please ensure your character is rigged."
	}
	if strings.Contains(output, "No animation data found") {
		return "The animation file does not contain animation data."
	}
	if strings.Contains(output, "Retargeting failed") {
		return "Animation retargeting failed. The rigs may be incompatible."
	}
	if strings.Contains(output, "AttributeError") {
		return "Python Script Error: Attribute Error (see logs)"
	}
	if strings.Contains(output, "ImportError") {
		return "Python Script Error: Import Error (see logs)"
	}

	// Return exec error if available
	if execErr != nil {
		return execErr.Error()
	}

	return "Unknown error occurred"
}

// resolveScriptPath looks for the script in multiple locations
func (s *ExportService) resolveScriptPath(scriptName string) (string, error) {
	cwd, _ := os.Getwd()
	possiblePaths := []string{
		// Relative to CWD
		filepath.Join("backend", "export", scriptName),
		filepath.Join("export", scriptName),
		// Relative to cmd/server (up 2 levels)
		filepath.Join("..", "..", "export", scriptName),
		// Absolute fallback (Desktop/3D/backend/export)
		filepath.Join(cwd, "..", "..", "export", scriptName),
		`C:\Users\Abdo\Desktop\3D\backend\export\` + scriptName,
	}

	for _, p := range possiblePaths {
		abs, _ := filepath.Abs(p)
		if _, err := os.Stat(abs); err == nil {
			fmt.Printf("Resolved script path: %s\n", abs)
			return abs, nil
		}
	}

	return "", fmt.Errorf("script '%s' not found. Searched in: %v", scriptName, possiblePaths)
}

// CleanupOldExports removes export files older than specified duration
func (s *ExportService) CleanupOldExports(maxAge time.Duration) error {
	entries, err := os.ReadDir(s.exportDir)
	if err != nil {
		return err
	}

	now := time.Now()
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		if now.Sub(info.ModTime()) > maxAge {
			filePath := filepath.Join(s.exportDir, entry.Name())
			os.Remove(filePath)
		}
	}

	return nil
}
