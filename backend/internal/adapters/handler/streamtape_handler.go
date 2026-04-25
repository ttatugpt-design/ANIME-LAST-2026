package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
)

type StreamtapeHandler struct{}

func NewStreamtapeHandler() *StreamtapeHandler {
	return &StreamtapeHandler{}
}

type StreamtapeResponse struct {
	Status int         `json:"status"`
	Msg    string      `json:"msg"`
	Result interface{} `json:"result"`
}

type StreamtapeFileRequest struct {
	URL   string `json:"url"`
	Title string `json:"title"`
}

func (h *StreamtapeHandler) GetAccountInfo(c *gin.Context) {
	login := c.Query("login")
	key := c.Query("key")
	if login == "" || key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing login or key parameter"})
		return
	}

	apiUrl := fmt.Sprintf("https://api.streamtape.com/account/info?login=%s&key=%s", login, key)
	resp, err := http.Get(apiUrl)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	var res StreamtapeResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse Streamtape response"})
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *StreamtapeHandler) RemoteUpload(c *gin.Context) {
	var input struct {
		Login      string                  `json:"login"`
		Key        string                  `json:"key"`
		FolderName string                  `json:"folder_name"`
		Files      []StreamtapeFileRequest `json:"files"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Login == "" || input.Key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing credentials"})
		return
	}

	if len(input.Files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No files provided"})
		return
	}

	folderID := ""
	// 1. Create Folder if name is provided
	if input.FolderName != "" && input.FolderName != "/" {
		createUrl := fmt.Sprintf("https://api.streamtape.com/file/createfolder?login=%s&key=%s&name=%s", input.Login, input.Key, url.QueryEscape(input.FolderName))
		resp, err := http.Get(createUrl)
		if err == nil {
			defer resp.Body.Close()
			var res StreamtapeResponse
			if err := json.NewDecoder(resp.Body).Decode(&res); err == nil && res.Status == 200 {
				resMap, ok := res.Result.(map[string]interface{})
				if ok {
					folderID = fmt.Sprintf("%v", resMap["folderid"])
				}
			}
		}
	}

	// 2. Trigger Remote Upload for each file
	successCount := 0
	for _, file := range input.Files {
		// Streamtape remotedl/add supports 'name' parameter for naming
		remoteUrl := fmt.Sprintf("https://api.streamtape.com/remotedl/add?login=%s&key=%s&url=%s&name=%s", input.Login, input.Key, url.QueryEscape(file.URL), url.QueryEscape(file.Title))
		if folderID != "" {
			remoteUrl += "&folder=" + folderID
		}
		
		resp, err := http.Get(remoteUrl)
		if err != nil {
			continue
		}
		
		var res StreamtapeResponse
		if err := json.NewDecoder(resp.Body).Decode(&res); err == nil && res.Status == 200 {
			successCount++
		}
		resp.Body.Close()
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      fmt.Sprintf("Successfully processing %d files on Streamtape", successCount),
		"files_queued": successCount,
		"folder_id":    folderID,
	})
}
