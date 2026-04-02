package handler

import (
	"backend/internal/core/domain"
	"backend/internal/core/service"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"regexp"
)

// sanitizeFileName removes illegal characters from a string to make it a safe filename
func sanitizeFileName(name string) string {
	// Remove non-alphanumeric/spaces, but keep some basics
	reg := regexp.MustCompile(`[\\/:*?"<>|]`)
	res := reg.ReplaceAllString(name, " ")
	return strings.TrimSpace(res)
}

type MirroredHandler struct {
	episodeSvc      *service.EpisodeService
	serverSvc       *service.ServerService
	embedAccountSvc *service.EmbedAccountService
	db              *gorm.DB
}

func NewMirroredHandler(episodeSvc *service.EpisodeService, serverSvc *service.ServerService, embedAccountSvc *service.EmbedAccountService, db *gorm.DB) *MirroredHandler {
	return &MirroredHandler{
		episodeSvc:      episodeSvc,
		serverSvc:       serverSvc,
		embedAccountSvc: embedAccountSvc,
		db:              db,
	}
}

type MirroredResponse struct {
	Status  bool            `json:"status"`
	Message json.RawMessage `json:"message"`
}

func (h *MirroredHandler) doRequestWithRetry(method, urlStr string, data url.Values) (*http.Response, error) {
	var resp *http.Response
	var err error
	for i := 0; i < 3; i++ {
		if method == "POST" {
			resp, err = http.PostForm(urlStr, data)
		} else {
			resp, err = http.Get(urlStr)
		}
		if err == nil && resp.StatusCode == 200 {
			return resp, nil
		}
		if resp != nil {
			resp.Body.Close()
		}
		fmt.Printf("[Mirrored.to] Request attempt %d failed: %v. Retrying in 2s...\n", i+1, err)
		time.Sleep(2 * time.Second)
	}
	return nil, fmt.Errorf("failed after 3 attempts: %v", err)
}

func (h *MirroredHandler) PushMergedFile(c *gin.Context) {
	episodeID, err := strconv.ParseUint(c.Param("episode_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode ID"})
		return
	}

	filePath := c.PostForm("filePath")
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File path is required"})
		return
	}

	accountIDStr := c.Query("account_id")
	if accountIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Account ID is required"})
		return
	}
	accountID, _ := strconv.ParseUint(accountIDStr, 10, 32)
	account, err := h.embedAccountSvc.GetByID(uint(accountID))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Embed Account not found"})
		return
	}
	apiKey := strings.TrimSpace(account.ApiKey)

	// Optional: get system server display name for episode server entries
	serverDisplayName := ""
	if serverIDQ := c.Query("server_id"); serverIDQ != "" {
		if serverIDN, err2 := strconv.ParseUint(serverIDQ, 10, 32); err2 == nil {
			if srv, srvErr := h.serverSvc.GetByID(uint(serverIDN)); srvErr == nil {
				serverDisplayName = srv.NameEn
				if serverDisplayName == "" {
					serverDisplayName = srv.NameAr
				}
			}
		}
	}

	latestEp, err := h.episodeSvc.GetByID(uint(episodeID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Episode not found"})
		return
	}

	// 1. Determine the name to use
	var mirroredName string
	var settings domain.Settings
	if err := h.db.First(&settings).Error; err == nil && settings.FakeNamingActive {
		// Generate sequential name (e.g. ab0000001)
		mirroredName = fmt.Sprintf("%s%07d", settings.FakeNamingPrefix, settings.FakeNamingCounter)
		
		// Increment counter in DB immediately
		h.db.Model(&settings).Update("fake_naming_counter", settings.FakeNamingCounter+1)
		
		fmt.Printf("[SEQUENTIAL] Using fake name: %s\n", mirroredName)
	} else {
		// Fallback to sanitized title
		mirroredName = sanitizeFileName(latestEp.Title)
		if mirroredName == "" {
			mirroredName = fmt.Sprintf("Episode-%d", latestEp.EpisodeNumber)
		}
	}
	
	// Add original extension if available
	ext := filepath.Ext(c.Query("fileName"))
	if ext == "" {
		ext = ".mp4"
	}
	mirroredFileName := mirroredName + ext

	// 2. Prepare search targets (ONLY the name used for upload - ensures 100% match)
	targetTitles := []string{mirroredFileName}

	// 0. Capture exact local file size before upload
	fStat, _ := os.Stat(filePath)
	fileSize := fStat.Size()

	// Start background push
	go func() {
		fmt.Printf("[Mirrored.to] Background Pushing '%s' (%d bytes) for Ep %d\n", mirroredFileName, fileSize, uint(episodeID))

		// 1. Get Upload Info (Step 1)
		uploadInfo, err := h.getUploadInfo(apiKey)
		if err != nil {
			fmt.Printf("[Mirrored.to ERROR] Step 1 failed: %v\n", err)
			return
		}

		uploadID := uploadInfo["upload_id"].(string)
		uploadURL := uploadInfo["file_upload_url"].(string)

		// 2. Upload File (Step 2)
		src, err := os.Open(filePath)
		if err != nil {
			fmt.Printf("[Mirrored.to ERROR] Failed to open local file: %v\n", err)
			return
		}
		defer src.Close()
		defer os.Remove(filePath) // Cleanup

		if err := h.uploadFile(uploadURL, apiKey, uploadID, mirroredFileName, src); err != nil {
			fmt.Printf("[Mirrored.to ERROR] Step 2 failed: %v\n", err)
			return
		}

		// 3. Finish Upload (Step 3)
		mirrors := "doodstream,streamtape,voesx,voe,voe.sx,mixdrop,solidfiles,bayfiles,anonfile,ddlto,uptobox" 
		finishRes, err := h.finishUpload(apiKey, uploadID, mirrors, mirroredFileName)
		if err != nil {
			fmt.Printf("[Mirrored.to ERROR] Step 3 failed: %v\n", err)
			return
		}

		fileID := finishRes["file_id"].(string)

		// Fetch linked credentials
		fullAccount, _ := h.embedAccountSvc.GetByID(uint(accountID))
		linkedJSON := ""
		if fullAccount != nil {
			linkedJSON = fullAccount.LinkedAccountsJSON
		}

		// 4. Monitor and Update Episode
		h.monitorAndLink(uint(episodeID), apiKey, fileID, targetTitles, linkedJSON, serverDisplayName)
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Upload request received and started in background for Mirrored.to.",
		"status":  "processing",
	})
}

func (h *MirroredHandler) getUploadInfo(apiKey string) (map[string]interface{}, error) {
	resp, err := h.doRequestWithRetry("POST", "https://www.mirrored.to/api/v1/get_upload_info", url.Values{"api_key": {apiKey}})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var res MirroredResponse
	if err := json.Unmarshal(bodyBytes, &res); err != nil {
		return nil, err
	}
	if !res.Status {
		return nil, fmt.Errorf("Mirrored.to API error: %s", string(res.Message))
	}
	var data map[string]interface{}
	_ = json.Unmarshal(res.Message, &data)
	return data, nil
}

func (h *MirroredHandler) uploadFile(uploadURL, apiKey, uploadID, fileName string, src *os.File) error {
	fileInfo, _ := src.Stat()
	fileSize := fileInfo.Size()

	hMeta := &bytes.Buffer{}
	mw := multipart.NewWriter(hMeta)
	_ = mw.WriteField("api_key", apiKey)
	_ = mw.WriteField("upload_id", uploadID)
	_ = mw.WriteField("name", fileName) 
	_, _ = mw.CreateFormFile("Filedata", fileName)
	
	boundary := mw.Boundary()
	headerContent := hMeta.Bytes()
	closeBoundary := []byte("\r\n--" + boundary + "--\r\n")
	totalSize := int64(len(headerContent)) + fileSize + int64(len(closeBoundary))
	
	requestBody := io.MultiReader(bytes.NewReader(headerContent), src, bytes.NewReader(closeBoundary))
	req, _ := http.NewRequest("POST", uploadURL, requestBody)
	req.ContentLength = totalSize
	req.Header.Set("Content-Type", "multipart/form-data; boundary="+boundary)

	client := &http.Client{Timeout: 60 * time.Minute}
	resp, err := client.Do(req)
	if err != nil { return err }
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var res MirroredResponse
	if err := json.Unmarshal(bodyBytes, &res); err != nil { return err }
	if !res.Status { return fmt.Errorf("upload error: %s", string(res.Message)) }
	return nil
}

func (h *MirroredHandler) finishUpload(apiKey, uploadID, mirrors, fileName string) (map[string]interface{}, error) {
	resp, err := h.doRequestWithRetry("POST", "https://www.mirrored.to/api/v1/finish_upload", url.Values{
		"api_key":   {apiKey},
		"upload_id": {uploadID},
		"mirrors":   {mirrors},
		"name":      {fileName}, 
	})
	if err != nil { return nil, err }
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var res MirroredResponse
	if err := json.Unmarshal(bodyBytes, &res); err != nil { return nil, err }
	if !res.Status { return nil, fmt.Errorf("finish error: %s", string(res.Message)) }

	var data map[string]interface{}
	_ = json.Unmarshal(res.Message, &data)
	return data, nil
}

func (h *MirroredHandler) monitorAndLink(episodeID uint, apiKey string, fileID string, targetTitles []string, linkedJSON string, serverDisplayName string) {
	fmt.Printf("[Mirrored.to] Waiting 45 seconds for mirrors to initialize (Targets: %v)...\n", targetTitles)
	time.Sleep(45 * time.Second)

	seenMirrors := make(map[string]bool)
	h.proactiveSearchAndAdd(episodeID, targetTitles, linkedJSON, seenMirrors, serverDisplayName)

	ticker := time.NewTicker(45 * time.Second)
	defer ticker.Stop()
	timeout := time.After(30 * time.Minute)

	for {
		select {
		case <-ticker.C:
			h.proactiveSearchAndAdd(episodeID, targetTitles, linkedJSON, seenMirrors, serverDisplayName)
			var linked []struct{ Type string }
			_ = json.Unmarshal([]byte(linkedJSON), &linked)
			if len(seenMirrors) >= len(linked) && len(linked) > 0 {
				fmt.Printf("[Mirrored.to] SUCCESS! Found all %d servers for Episode %d.\n", len(seenMirrors), episodeID)
				return
			}
		case <-timeout:
			return
		}
	}
}

func (h *MirroredHandler) proactiveSearchAndAdd(episodeID uint, targetTitles []string, linkedJSON string, seen map[string]bool, serverDisplayName string) {
	if linkedJSON == "" || linkedJSON == "[]" { return }
	var linked []struct {
		Type        string `json:"type"`
		ApiKey      string `json:"api_key"`
		ApiPassword string `json:"api_password"`
	}
	_ = json.Unmarshal([]byte(linkedJSON), &linked)

	for _, la := range linked {
		siteName := strings.ToLower(la.Type)
		if strings.Contains(siteName, "dood") {
			if !seen["Doodstream"] { h.searchDoodstream(la.ApiKey, episodeID, seen, targetTitles, serverDisplayName) }
		} else if strings.Contains(siteName, "streamtape") {
			if !seen["Streamtape"] { h.searchStreamtape(la.ApiKey, la.ApiPassword, episodeID, seen, targetTitles, serverDisplayName) }
		} else if strings.Contains(siteName, "mixdrop") {
			if !seen["Mixdrop"] { h.searchMixdrop(la.ApiKey, la.ApiPassword, episodeID, seen, targetTitles, serverDisplayName) }
		} else if strings.Contains(siteName, "voe") {
			if !seen["voe.sx"] { h.searchVoe(la.ApiKey, episodeID, seen, targetTitles, serverDisplayName) }
		}
	}
}

func (h *MirroredHandler) searchDoodstream(apiKey string, episodeID uint, seen map[string]bool, targetTitles []string, serverDisplayName string) {
	searchURL := fmt.Sprintf("https://doodapi.com/api/file/list?key=%s", apiKey)
	resp, err := http.Get(searchURL)
	if err != nil { return }
	defer resp.Body.Close()

	var result struct {
		Status int `json:"status"`
		Result struct {
			Files []struct {
				FileCode string `json:"file_code"`
				Title    string `json:"title"`
				Uploaded string `json:"uploaded"`
			} `json:"files"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err == nil && result.Status == 200 && len(result.Result.Files) > 0 {
		var latestFile struct {
			FileCode string
			Title    string
			Uploaded string
		}
		
		for _, f := range result.Result.Files {
			cleanFound := strings.ToLower(f.Title)
			matchFound := false
			for _, target := range targetTitles {
				cleanTarget := strings.ToLower(strings.TrimSuffix(target, filepath.Ext(target)))
				if strings.Contains(cleanFound, cleanTarget) {
					matchFound = true
					break
				}
			}

			if matchFound {
				if latestFile.Uploaded == "" || f.Uploaded > latestFile.Uploaded {
					latestFile.FileCode = f.FileCode
					latestFile.Title = f.Title
					latestFile.Uploaded = f.Uploaded
				}
			}
		}

		if latestFile.FileCode != "" {
			name := serverDisplayName
			if name == "" { name = "Doodstream" }
			h.addServerToEpisode(episodeID, name, "https://myvidplay.com/e/"+latestFile.FileCode)
			seen["Doodstream"] = true
		}
	}
}

func (h *MirroredHandler) searchStreamtape(login, key string, episodeID uint, seen map[string]bool, targetTitles []string, serverDisplayName string) {
	listURL := fmt.Sprintf("https://api.streamtape.com/file/listfolder?login=%s&key=%s", login, key)
	resp, err := http.Get(listURL)
	if err != nil { return }
	defer resp.Body.Close()

	var resL struct {
		Status int `json:"status"`
		Result struct {
			Files []struct {
				LinkID string `json:"linkid"`
				Name   string `json:"name"`
				Ctime  int64  `json:"ctime"`
			} `json:"files"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&resL); err == nil && resL.Status == 200 && len(resL.Result.Files) > 0 {
		var latestFile struct {
			LinkID string
			Name   string
			Ctime  int64
		}
		
		for _, f := range resL.Result.Files {
			cleanFound := strings.ToLower(f.Name)
			matchFound := false
			for _, target := range targetTitles {
				cleanTarget := strings.ToLower(strings.TrimSuffix(target, filepath.Ext(target)))
				if strings.Contains(cleanFound, cleanTarget) {
					matchFound = true
					break
				}
			}

			if matchFound {
				if f.Ctime > latestFile.Ctime {
					latestFile.LinkID = f.LinkID
					latestFile.Name = f.Name
					latestFile.Ctime = f.Ctime
				}
			}
		}

		if latestFile.LinkID != "" {
			name := serverDisplayName
			if name == "" { name = "Streamtape" }
			h.addServerToEpisode(episodeID, name, "https://streamtape.com/e/"+latestFile.LinkID)
			seen["Streamtape"] = true
		}
	}
}

func (h *MirroredHandler) searchMixdrop(email, key string, episodeID uint, seen map[string]bool, targetTitles []string, serverDisplayName string) {
	searchURL := fmt.Sprintf("https://api.mixdrop.co/file/list?email=%s&key=%s", email, key)
	resp, _ := http.Get(searchURL)
	if resp == nil { return }
	defer resp.Body.Close()
	var result struct {
		Success bool `json:"success"`
		Result  []struct {
			FileRef string `json:"fileref"`
			Title    string `json:"title"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err == nil && result.Success && len(result.Result) > 0 {
		for _, f := range result.Result {
			cleanFound := strings.ToLower(f.Title)
			matchFound := false
			for _, target := range targetTitles {
				cleanTarget := strings.ToLower(strings.TrimSuffix(target, filepath.Ext(target)))
				if strings.Contains(cleanFound, cleanTarget) {
					matchFound = true
					break
				}
			}

			if matchFound {
				name := serverDisplayName
				if name == "" { name = "Mixdrop" }
				h.addServerToEpisode(episodeID, name, "https://mixdrop.co/e/"+f.FileRef)
				seen["Mixdrop"] = true
				return
			}
		}
	}
}

func (h *MirroredHandler) searchVoe(apiKey string, episodeID uint, seen map[string]bool, targetTitles []string, serverDisplayName string) {
	searchURL := fmt.Sprintf("https://voe.sx/api/file/list?key=%s", apiKey)
	resp, err := http.Get(searchURL)
	if err != nil { return }
	defer resp.Body.Close()
	
	var result struct {
		Status int `json:"status"`
		Result struct {
			Data []struct {
				FileCode  string `json:"filecode"`
				Title     string `json:"title"`
				CreatedAt string `json:"created_at"`
			} `json:"data"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err == nil && result.Status == 200 && len(result.Result.Data) > 0 {
		var latestFile struct {
			FileCode  string
			Title     string
			CreatedAt string
		}

		for _, f := range result.Result.Data {
			cleanFound := strings.ToLower(f.Title)
			matchFound := false
			for _, target := range targetTitles {
				cleanTarget := strings.ToLower(strings.TrimSuffix(target, filepath.Ext(target)))
				if strings.Contains(cleanFound, cleanTarget) {
					matchFound = true
					break
				}
			}

			if matchFound {
				if latestFile.CreatedAt == "" || f.CreatedAt > latestFile.CreatedAt {
					latestFile.FileCode = f.FileCode
					latestFile.Title = f.Title
					latestFile.CreatedAt = f.CreatedAt
				}
			}
		}

		if latestFile.FileCode != "" {
			name := serverDisplayName
			if name == "" { name = "voe.sx" }
			h.addServerToEpisode(episodeID, name, "https://voe.sx/e/"+latestFile.FileCode)
			seen["voe.sx"] = true
		}
	}
}

func (h *MirroredHandler) addServerToEpisode(episodeID uint, name, embedURL string) {
	ep, _ := h.episodeSvc.GetByID(episodeID)
	if ep == nil { return }
	for _, s := range ep.Servers {
		if s.URL == embedURL { return }
	}
	ep.Servers = append(ep.Servers, domain.EpisodeServer{
		EpisodeID: episodeID,
		Language:  "ar",
		Name:      name,
		URL:       embedURL,
		Type:      "embed",
	})
	_ = h.episodeSvc.Update(ep)
}
