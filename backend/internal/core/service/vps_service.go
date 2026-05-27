package service

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"backend/internal/core/domain"

	"golang.org/x/crypto/ssh"
	"gorm.io/gorm"
)

type VPSFileEntry struct {
	Name       string `json:"name"`
	Type       string `json:"type"`
	Size       int64  `json:"size"`
	ModifiedAt string `json:"modified_at"`
}

type VPSService struct {
	db     *gorm.DB
	sshCfg *ssh.ClientConfig
	vpsIP  string

	// Per-link progress tracking (in-memory, for live status)
	mu           sync.RWMutex
	linkProgress map[uint][]float64 // taskID -> progress per link
	linkStatus   map[uint][]string  // taskID -> status per link
}

func NewVPSService(db *gorm.DB, ip, user, keyPath, password string) (*VPSService, error) {
	authMethods := make([]ssh.AuthMethod, 0, 2)

	if keyPath != "" {
		key, err := os.ReadFile(keyPath)
		if err == nil {
			signer, err := ssh.ParsePrivateKey(key)
			if err != nil {
				return nil, fmt.Errorf("unable to parse private key: %v", err)
			}
			authMethods = append(authMethods, ssh.PublicKeys(signer))
		}
	}

	if password != "" {
		authMethods = append(authMethods, ssh.Password(password))
	}

	if len(authMethods) == 0 {
		return nil, fmt.Errorf("no SSH auth method configured")
	}

	config := &ssh.ClientConfig{
		User:            user,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         30 * time.Second,
	}

	return &VPSService{
		db:           db,
		sshCfg:       config,
		vpsIP:        ip,
		linkProgress: make(map[uint][]float64),
		linkStatus:   make(map[uint][]string),
	}, nil
}

func shellEscape(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "'\\''") + "'"
}

func fileTypeFromFindType(kind string) string {
	switch kind {
	case "d":
		return "directory"
	case "l":
		return "symlink"
	case "p":
		return "pipe"
	case "s":
		return "socket"
	case "b":
		return "block"
	case "c":
		return "character"
	case "D":
		return "door"
	default:
		return "file"
	}
}

func (s *VPSService) ListDirectory(remotePath string) ([]VPSFileEntry, error) {
	if strings.TrimSpace(remotePath) == "" {
		remotePath = "/"
	}

	escapePath := shellEscape(remotePath)
	command := fmt.Sprintf("cd %s && find . -maxdepth 1 -mindepth 1 -printf '%%y\x1f%%s\x1f%%TY-%%Tm-%%Td %%TH:%%TM\x1f%%f\x1e' | sort", escapePath)

	client, err := s.dial()
	if err != nil {
		return nil, fmt.Errorf("SSH dial failed: %v", err)
	}
	defer client.Close()

	session, err := client.NewSession()
	if err != nil {
		return nil, fmt.Errorf("SSH session failed: %v", err)
	}
	defer session.Close()

	output, err := session.CombinedOutput(command)
	if err != nil {
		return nil, fmt.Errorf("SSH command failed: %v: %s", err, strings.TrimSpace(string(output)))
	}

	entries := make([]VPSFileEntry, 0)
	for _, record := range bytes.Split(output, []byte{0x1e}) {
		if len(record) == 0 {
			continue
		}

		parts := bytes.Split(record, []byte{0x1f})
		if len(parts) != 4 {
			continue
		}

		size, _ := strconv.ParseInt(string(parts[1]), 10, 64)
		entries = append(entries, VPSFileEntry{
			Name:       string(parts[3]),
			Type:       fileTypeFromFindType(string(parts[0])),
			Size:       size,
			ModifiedAt: string(parts[2]),
		})
	}

	return entries, nil
}

func (s *VPSService) AddTask(animeName string, links []string, taskType string) error {
	linksJSON, _ := json.Marshal(links)
	task := domain.VPSTask{
		AnimeName: animeName,
		Links:     string(linksJSON),
		Type:      taskType,
		Status:    "pending",
		Progress:  0,
	}
	return s.db.Create(&task).Error
}

func (s *VPSService) GetTasks(animeName string) ([]domain.VPSTask, error) {
	var tasks []domain.VPSTask
	err := s.db.Where("anime_name = ?", animeName).Order("created_at desc").Find(&tasks).Error
	return tasks, err
}

// DeleteLink removes a link from a task and kills its aria2c process if running
func (s *VPSService) DeleteLink(animeName string, linkIndex int) error {
	var task domain.VPSTask
	if err := s.db.Where("anime_name = ? AND status IN ?", animeName, []string{"pending", "processing", "completed", "failed"}).Order("created_at desc").First(&task).Error; err != nil {
		return fmt.Errorf("task not found")
	}

	var links []string
	if err := json.Unmarshal([]byte(task.Links), &links); err != nil {
		return err
	}

	// linkIndex is 1-based (from UI)
	if linkIndex < 1 || linkIndex > len(links) {
		return fmt.Errorf("invalid link index")
	}

	// Set the link to empty string to mark as deleted, preserving the index
	links[linkIndex-1] = ""

	linksJSON, _ := json.Marshal(links)
	task.Links = string(linksJSON)
	s.db.Save(&task)

	// If task is processing, kill the aria2c process for this specific file on VPS
	if task.Status == "processing" {
		filename := fmt.Sprintf("%02d.mp4", linkIndex)
		killCmd := fmt.Sprintf("pkill -f \"aria2c.*%s\"", filename)
		go s.runSSHCommand(killCmd) // non-blocking

		// Update in-memory status
		s.mu.Lock()
		if linkIndex-1 < len(s.linkStatus[task.ID]) {
			s.linkStatus[task.ID][linkIndex-1] = "deleted"
			s.linkProgress[task.ID][linkIndex-1] = 0
		}
		s.mu.Unlock()
	}

	return nil
}

// GetLinkProgress returns the current per-link progress for a task
func (s *VPSService) GetLinkProgress(taskID uint) ([]float64, []string) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.linkProgress[taskID], s.linkStatus[taskID]
}

func (s *VPSService) StartWorker() {
	log.Println("[VPS Service] Starting background worker...")

	// Test SSH connection
	go func() {
		log.Println("[VPS Service] Testing SSH connection...")
		err := s.runSSHCommand("echo 'Connection OK' > /tmp/vps_test.txt")
		if err != nil {
			log.Printf("[VPS Service] SSH Connection FAILED: %v", err)
		} else {
			log.Println("[VPS Service] SSH Connection SUCCESSFUL!")
		}
	}()

	// Background task processor
	go func() {
		for {
			var task domain.VPSTask
			result := s.db.Where("status = ?", "pending").Order("created_at asc").First(&task)
			if result.Error == nil {
				log.Printf("[VPS Service] Processing task ID %d: %s (%s)", task.ID, task.AnimeName, task.Type)
				s.processTask(&task)
			}
			time.Sleep(5 * time.Second)
		}
	}()
}

func (s *VPSService) processTask(task *domain.VPSTask) {
	task.Status = "processing"
	s.db.Save(task)

	var err error
	if task.Type == "download" {
		err = s.runDownload(task)
	} else if task.Type == "upload" {
		err = s.runUpload(task)
	}

	if err != nil {
		task.Status = "failed"
		task.Error = err.Error()
		log.Printf("[VPS Service] Task %d FAILED: %v", task.ID, err)
	} else {
		task.Status = "completed"
		task.Progress = 100
		log.Printf("[VPS Service] Task %d COMPLETED", task.ID)
	}
	s.db.Save(task)

	// Cleanup in-memory progress tracking
	s.mu.Lock()
	delete(s.linkProgress, task.ID)
	delete(s.linkStatus, task.ID)
	s.mu.Unlock()
}

// dial opens a persistent SSH client connection
func (s *VPSService) dial() (*ssh.Client, error) {
	return ssh.Dial("tcp", s.vpsIP+":22", s.sshCfg)
}

// runSSHCommand runs a command over SSH (new connection per call)
func (s *VPSService) runSSHCommand(command string) error {
	client, err := s.dial()
	if err != nil {
		return fmt.Errorf("SSH dial failed: %v", err)
	}
	defer client.Close()

	session, err := client.NewSession()
	if err != nil {
		return fmt.Errorf("SSH session failed: %v", err)
	}
	defer session.Close()

	return session.Run(command)
}

// writeFileViaSSH writes content to a remote file using SSH stdin piping
func (s *VPSService) writeFileViaSSH(content, remotePath string) error {
	client, err := s.dial()
	if err != nil {
		return fmt.Errorf("SSH dial failed: %v", err)
	}
	defer client.Close()

	session, err := client.NewSession()
	if err != nil {
		return fmt.Errorf("SSH session failed: %v", err)
	}
	defer session.Close()

	stdin, err := session.StdinPipe()
	if err != nil {
		return err
	}

	go func() {
		defer stdin.Close()
		io.WriteString(stdin, content)
	}()

	return session.Run(fmt.Sprintf("cat > %s", remotePath))
}

// runDownload uses a custom bash script on the VPS to download ALL links concurrently
// and print real-time JSON progress for perfect UI tracking.
func (s *VPSService) runDownload(task *domain.VPSTask) error {
	var links []string
	if err := json.Unmarshal([]byte(task.Links), &links); err != nil {
		return fmt.Errorf("failed to parse links: %v", err)
	}

	if len(links) == 0 {
		return fmt.Errorf("no links provided")
	}

	animeDir := fmt.Sprintf("/root/anime/%s", task.AnimeName)
	scriptFile := fmt.Sprintf("/tmp/download_script_%d.sh", task.ID)

	// Initialize per-link tracking
	s.mu.Lock()
	s.linkProgress[task.ID] = make([]float64, len(links))
	s.linkStatus[task.ID] = make([]string, len(links))
	for i := range links {
		s.linkStatus[task.ID][i] = "pending"
	}
	s.mu.Unlock()

	// Build the custom bash script
	var scriptBuilder strings.Builder
	scriptBuilder.WriteString("#!/bin/bash\n")
	scriptBuilder.WriteString(fmt.Sprintf("mkdir -p '%s'\n", animeDir))
	scriptBuilder.WriteString("USER_AGENT=\"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36\"\n\n")

	// Launch aria2c in background for each link
	for i, link := range links {
		filename := fmt.Sprintf("%02d.mp4", i+1)
		logFile := fmt.Sprintf("/tmp/aria_%d_%02d.log", task.ID, i+1)
		scriptBuilder.WriteString(fmt.Sprintf("rm -f '%s'\n", logFile))

		if link == "" {
			// This link was deleted, just mark it complete in log so the monitor ignores it
			scriptBuilder.WriteString(fmt.Sprintf("echo 'Download complete' > '%s'\n", logFile))
			continue
		}

		// Use -x 16 for speed, output to specific log file, run in background (&)
		// Added --max-tries=0 and --retry-wait=3 for infinite retries on failure
		scriptBuilder.WriteString(fmt.Sprintf("aria2c -x 16 -s 16 -U \"$USER_AGENT\" --max-tries=0 --retry-wait=3 --auto-file-renaming=false --allow-overwrite=true \"%s\" -d '%s' -o '%s' --summary-interval=2 > '%s' 2>&1 &\n", link, animeDir, filename, logFile))
	}

	// Loop to monitor progress and print JSON
	scriptBuilder.WriteString("\nwhile true; do\n")
	scriptBuilder.WriteString("  all_done=true\n")
	scriptBuilder.WriteString("  echo -n \"{\"\n")

	for i := range links {
		idx := fmt.Sprintf("%02d", i+1)
		logFile := fmt.Sprintf("/tmp/aria_%d_%s.log", task.ID, idx)

		scriptBuilder.WriteString(fmt.Sprintf(`
  pct=$(tail -n 15 "%s" 2>/dev/null | grep -oE "\([0-9]+%%\)" | tail -n 1 | tr -d '()%%')
  status="downloading"
  if [ -z "$pct" ]; then
    if grep -q "Download complete" "%s" 2>/dev/null; then
      pct=100
      status="completed"
    elif grep -q "ERROR" "%s" 2>/dev/null; then
      pct=0
      status="failed"
    else
      pct=0
      all_done=false
    fi
  else
    all_done=false
  fi
  echo -n "\"%d\": {\"pct\": $pct, \"status\": \"$status\"}"
`, logFile, logFile, logFile, i))

		if i < len(links)-1 {
			scriptBuilder.WriteString("  echo -n \",\"\n")
		}
	}

	scriptBuilder.WriteString("\n  echo \"}\"\n")
	scriptBuilder.WriteString("  if $all_done; then break; fi\n")
	scriptBuilder.WriteString("  sleep 2\n")
	scriptBuilder.WriteString("done\n")

	// Write script to VPS
	if err := s.writeFileViaSSH(scriptBuilder.String(), scriptFile); err != nil {
		return fmt.Errorf("failed to write bash script: %v", err)
	}
	log.Printf("[VPS Service] Uploaded custom download script to %s", scriptFile)

	// Run script and parse JSON output
	cmd := fmt.Sprintf("bash '%s'; rm -f '%s'", scriptFile, scriptFile)

	if err := s.runDownloadWithTracking(cmd, task, len(links)); err != nil {
		return fmt.Errorf("download script failed: %v", err)
	}

	// Cleanup log files on VPS
	s.runSSHCommand(fmt.Sprintf("rm -f /tmp/aria_%d_*.log", task.ID))

	// Mark all as completed
	s.mu.Lock()
	for i := range s.linkStatus[task.ID] {
		s.linkStatus[task.ID][i] = "completed"
		s.linkProgress[task.ID][i] = 100
	}
	s.mu.Unlock()

	return nil
}

// runDownloadWithTracking executes the bash script and parses the JSON stdout
func (s *VPSService) runDownloadWithTracking(command string, task *domain.VPSTask, totalLinks int) error {
	client, err := s.dial()
	if err != nil {
		return fmt.Errorf("SSH dial failed: %v", err)
	}
	defer client.Close()

	session, err := client.NewSession()
	if err != nil {
		return fmt.Errorf("SSH session failed: %v", err)
	}
	defer session.Close()

	stdout, err := session.StdoutPipe()
	if err != nil {
		return err
	}

	if err := session.Start(command); err != nil {
		return err
	}

	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 256*1024), 256*1024)

	// Expected JSON: {"0": {"pct": 15, "status": "downloading"}, "1": {"pct": 100, "status": "completed"}}
	type LinkStatus struct {
		Pct    float64 `json:"pct"`
		Status string  `json:"status"`
	}

	for scanner.Scan() {
		line := scanner.Text()

		if !strings.HasPrefix(line, "{") {
			continue // Skip non-JSON lines if any
		}

		var statusMap map[string]LinkStatus
		if err := json.Unmarshal([]byte(line), &statusMap); err != nil {
			log.Printf("[VPS Service] JSON Parse error: %v (line: %s)", err, line)
			continue
		}

		// Calculate global progress
		var totalPct float64
		s.mu.Lock()
		for key, info := range statusMap {
			var idx int
			fmt.Sscanf(key, "%d", &idx)
			if idx >= 0 && idx < totalLinks {
				s.linkProgress[task.ID][idx] = info.Pct
				s.linkStatus[task.ID][idx] = info.Status
			}
		}

		// Calculate global progress
		for _, pct := range s.linkProgress[task.ID] {
			totalPct += pct
		}
		s.mu.Unlock()

		globalProgress := totalPct / float64(totalLinks)
		if globalProgress > task.Progress {
			task.Progress = globalProgress
			s.db.Save(task)
		}
	}

	return session.Wait()
}

func (s *VPSService) runUpload(task *domain.VPSTask) error {
	animeDir := fmt.Sprintf("/root/anime/%s", task.AnimeName)
	dest := fmt.Sprintf("pcloud:Public Folder/Anime/%s", task.AnimeName)

	log.Printf("[VPS Service] Uploading %s to pCloud: %s", task.AnimeName, dest)
	cmd := fmt.Sprintf("rclone copy '%s' '%s' --progress 2>&1", animeDir, dest)

	return s.runSSHCommand(cmd)
}
