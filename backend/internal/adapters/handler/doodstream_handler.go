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
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type DoodstreamHandler struct {
	episodeSvc      *service.EpisodeService
	serverSvc       *service.ServerService
	embedAccountSvc *service.EmbedAccountService
}

func NewDoodstreamHandler(episodeSvc *service.EpisodeService, serverSvc *service.ServerService, embedAccountSvc *service.EmbedAccountService) *DoodstreamHandler {
	return &DoodstreamHandler{
		episodeSvc:      episodeSvc,
		serverSvc:       serverSvc,
		embedAccountSvc: embedAccountSvc,
	}
}

type DoodResponse struct {
	Status int         `json:"status"`
	Msg    string      `json:"msg"`
	Result interface{} `json:"result"`
}

func (h *DoodstreamHandler) HandleUpload(c *gin.Context) {
	episodeID, err := strconv.ParseUint(c.Param("episode_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid episode ID"})
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
	apiKey := account.ApiKey

	serverIDStr := c.Query("server_id")
	if serverIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Server ID is required"})
		return
	}
	serverID, _ := strconv.ParseUint(serverIDStr, 10, 32)
	targetServer, err := h.serverSvc.GetByID(uint(serverID))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Target Server not found"})
		return
	}

	// 1. Fetch Episode and Anime (for folder name)
	episode, err := h.episodeSvc.GetByID(uint(episodeID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Episode not found"})
		return
	}

	// 2. Get the file from request
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open uploaded file"})
		return
	}
	defer src.Close()

	// 3. Automate Doodstream Setup (Folder & Server)
	folderName := episode.Anime.TitleEn
	if folderName == "" {
		folderName = episode.Anime.Title // Fallback
	}
	fldID := h.getOrCreateFolder(folderName, apiKey)
	uploadURL := h.getUploadServer(apiKey)

	if uploadURL == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not get Doodstream upload server"})
		return
	}

	// 4. Stream to Doodstream without fully loading file into RAM
	fmt.Printf("[Doodstream] Streaming file '%s' to %s (Folder ID: %s)\n", file.Filename, uploadURL, fldID)
	
	pr, pw := io.Pipe()
	writer := multipart.NewWriter(pw)

	// Pre-calculate Content-Length to avoid chunked-encoding drop errors on older servers
	bodyBuf := &bytes.Buffer{}
	testWriter := multipart.NewWriter(bodyBuf)
	_ = testWriter.SetBoundary(writer.Boundary())
	_ = testWriter.WriteField("api_key", apiKey)
	_ = testWriter.WriteField("fld_id", fldID)
	_, _ = testWriter.CreateFormFile("file", file.Filename)
	headerSize := int64(bodyBuf.Len())
	
	bodyBuf.Reset()
	_ = testWriter.Close()
	footerSize := int64(bodyBuf.Len())
	
	go func() {
		defer pw.Close()
		
		// Add API Key
		_ = writer.WriteField("api_key", apiKey)
		// Add Folder ID
		_ = writer.WriteField("fld_id", fldID)
		
		// Add File
		part, err := writer.CreateFormFile("file", file.Filename)
		if err == nil {
			_, _ = io.Copy(part, src)
		}
		_ = writer.Close()
	}()

	// 5. POST to Doodstream
	req, err := http.NewRequest("POST", uploadURL, pr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Doodstream request"})
		return
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.ContentLength = headerSize + file.Size + footerSize

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Doodstream upload request failed: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	var result DoodResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse Doodstream response"})
		return
	}

	if result.Status != 200 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Doodstream error: " + result.Msg})
		return
	}

	// 6. Extract File Code (check both filecode and file_code)
	dataArr, ok := result.Result.([]interface{})
	if !ok || len(dataArr) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unexpected result format from Doodstream"})
		return
	}
	fileMap := dataArr[0].(map[string]interface{})
	
	fileCode := ""
	if val, found := fileMap["filecode"]; found {
		fileCode = fmt.Sprintf("%v", val)
	} else if val, found := fileMap["file_code"]; found {
		fileCode = fmt.Sprintf("%v", val)
	}

	if fileCode == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to extract file code from Doodstream (possibly link was not generated correctly)"})
		return
	}

	// Use myvidplay.com as requested
	embedLink := fmt.Sprintf("https://myvidplay.com/e/%s", fileCode)
	newServer := domain.EpisodeServer{
		EpisodeID: uint(episodeID),
		Language:  "ar",
		Name:      targetServer.NameEn,
		URL:       embedLink,
		Type:      "embed",
	}

	episode.Servers = append(episode.Servers, newServer)
	if err := h.episodeSvc.Update(episode); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link link to episode: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Episode uploaded and linked successfully!",
		"file_id":   fileCode,
		"embed_url": embedLink,
	})
}

func (h *DoodstreamHandler) getOrCreateFolder(name string, apiKey string) string {
	// Use doodapi.co
	resp, err := http.Get(fmt.Sprintf("https://doodapi.co/api/folder/list?key=%s", apiKey))
	if err == nil {
		defer resp.Body.Close()
		var result DoodResponse
		if json.NewDecoder(resp.Body).Decode(&result) == nil && result.Status == 200 {
			// Docs show result is map with "folders" key
			resMap, ok := result.Result.(map[string]interface{})
			if ok {
				folders, ok := resMap["folders"].([]interface{})
				if ok {
					for _, f := range folders {
						fMap, _ := f.(map[string]interface{})
						if strings.EqualFold(fmt.Sprintf("%v", fMap["name"]), name) {
							return fmt.Sprintf("%v", fMap["fld_id"])
						}
					}
				}
			}
		}
	}
	createURL := fmt.Sprintf("https://doodapi.co/api/folder/create?key=%s&name=%s", apiKey, url.QueryEscape(name))
	createResp, err := http.Get(createURL)
	if err == nil {
		defer createResp.Body.Close()
		var result DoodResponse
		if json.NewDecoder(createResp.Body).Decode(&result) == nil && result.Status == 200 {
			resMap, ok := result.Result.(map[string]interface{})
			if ok {
				return fmt.Sprintf("%v", resMap["fld_id"])
			}
		}
	}
	return "0"
}

func (h *DoodstreamHandler) getUploadServer(apiKey string) string {
	resp, err := http.Get(fmt.Sprintf("https://doodapi.co/api/upload/server?key=%s", apiKey))
	if err == nil {
		defer resp.Body.Close()
		var result DoodResponse
		if json.NewDecoder(resp.Body).Decode(&result) == nil && result.Status == 200 {
			uploadURL, ok := result.Result.(string)
			if ok {
				return uploadURL
			}
		}
	}
	return ""
}
