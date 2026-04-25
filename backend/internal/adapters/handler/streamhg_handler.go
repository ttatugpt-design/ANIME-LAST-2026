package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
)

type StreamHGHandler struct{}

func NewStreamHGHandler() *StreamHGHandler {
	return &StreamHGHandler{}
}

type StreamHGResponse struct {
	Msg    string      `json:"msg"`
	Status int         `json:"status"`
	Result interface{} `json:"result"`
}

type StreamHGFileRequest struct {
	URL   string `json:"url"`
	Title string `json:"title"`
}

func (h *StreamHGHandler) RemoteUpload(c *gin.Context) {
	var input struct {
		ApiKey     string                `json:"api_key"`
		FolderName string                `json:"folder_name"`
		Files      []StreamHGFileRequest `json:"files"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.ApiKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing API Key"})
		return
	}

	if len(input.Files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No files provided"})
		return
	}

	fldID := "0"
	// 1. Create Folder if name is provided
	if input.FolderName != "" && input.FolderName != "/" {
		createUrl := fmt.Sprintf("https://streamhgapi.com/api/folder/create?key=%s&name=%s", input.ApiKey, url.QueryEscape(input.FolderName))
		resp, err := http.Get(createUrl)
		if err == nil {
			defer resp.Body.Close()
			var res StreamHGResponse
			if err := json.NewDecoder(resp.Body).Decode(&res); err == nil {
				if res.Status == 200 {
					resMap, ok := res.Result.(map[string]interface{})
					if ok {
						fldID = fmt.Sprintf("%v", resMap["fld_id"])
					}
				}
			}
		}
	}

	// 2. Trigger Remote Upload and Rename for each file
	successCount := 0
	for _, file := range input.Files {
		// A. Trigger Remote Upload
		remoteUrl := fmt.Sprintf("https://streamhgapi.com/api/upload/url?key=%s&url=%s&fld_id=%s", input.ApiKey, url.QueryEscape(file.URL), fldID)
		resp, err := http.Get(remoteUrl)
		if err != nil {
			continue
		}
		
		var res StreamHGResponse
		if err := json.NewDecoder(resp.Body).Decode(&res); err == nil && res.Status == 200 {
			resMap, ok := res.Result.(map[string]interface{})
			if ok {
				fileCode := fmt.Sprintf("%v", resMap["filecode"])
				
				// B. Rename immediately (Backend-side)
				// We use both 'name' and 'file_title' to be sure
				renameUrl := fmt.Sprintf("https://streamhgapi.com/api/file/rename?key=%s&file_code=%s&name=%s", input.ApiKey, fileCode, url.QueryEscape(file.Title))
				http.Get(renameUrl)
				
				editUrl := fmt.Sprintf("https://streamhgapi.com/api/file/edit?key=%s&file_code=%s&file_title=%s", input.ApiKey, fileCode, url.QueryEscape(file.Title))
				http.Get(editUrl)
				
				successCount++
			}
		}
		resp.Body.Close()
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      fmt.Sprintf("Successfully processing %d files", successCount),
		"files_queued": successCount,
		"folder_id":    fldID,
	})
}

func (h *StreamHGHandler) ListFiles(c *gin.Context) {
	apiKey := c.Query("key")
	fldID := c.DefaultQuery("fld_id", "0")
	if apiKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing key"})
		return
	}

	// Helper to fetch and parse any XFS API endpoint
	fetchXFS := func(endpoint string) []map[string]interface{} {
		resp, err := http.Get(endpoint)
		if err != nil {
			fmt.Printf("[StreamHG Debug] Request failed for %s: %v\n", endpoint, err)
			return nil
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)
		// SILENT DEBUG: Log partial body to terminal
		fmt.Printf("[StreamHG Debug] Endpoint: %s | Body: %s\n", endpoint, string(body))

		var raw map[string]interface{}
		if err := json.Unmarshal(body, &raw); err != nil {
			fmt.Printf("[StreamHG Debug] JSON Unmarshal failed: %v\n", err)
			return nil
		}

		// Try to find the result list (can be an array or a map with files/folders keys)
		res, ok := raw["result"]
		if !ok {
			return nil
		}

		// Case 1: Result is already an array (flat mode)
		if items, ok := res.([]interface{}); ok {
			return h.interfaceToMapList(items)
		}

		// Case 2: Result is a map (nested mode)
		if resMap, ok := res.(map[string]interface{}); ok {
			// Look for 'files' or 'folders' keys
			if files, ok := resMap["files"].([]interface{}); ok {
				return h.interfaceToMapList(files)
			}
			if folders, ok := resMap["folders"].([]interface{}); ok {
				return h.interfaceToMapList(folders)
			}
		}
		return nil
	}

	// 1. Fetch Folders
	folders := fetchXFS(fmt.Sprintf("https://streamhgapi.com/api/folder/list?key=%s&fld_id=%s", apiKey, fldID))
	// 2. Fetch Files
	files := fetchXFS(fmt.Sprintf("https://streamhgapi.com/api/file/list?key=%s&fld_id=%s", apiKey, fldID))

	// 3. Combine
	c.JSON(http.StatusOK, gin.H{
		"status": 200,
		"result": gin.H{
			"folders": folders,
			"files":   files,
		},
	})
}

func (h *StreamHGHandler) interfaceToMapList(items []interface{}) []map[string]interface{} {
	var list []map[string]interface{}
	for _, it := range items {
		if m, ok := it.(map[string]interface{}); ok {
			// Ensure fld_id is a string for frontend consistency
			if fld, ok := m["fld_id"]; ok {
				m["fld_id"] = fmt.Sprintf("%v", fld)
			}
			list = append(list, m)
		}
	}
	return list
}

func (h *StreamHGHandler) DeleteFiles(c *gin.Context) {
	var input struct {
		ApiKey string   `json:"key"`
		Codes  []string `json:"codes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for _, code := range input.Codes {
		apiUrl := fmt.Sprintf("https://streamhgapi.com/api/file/delete?key=%s&file_code=%s", input.ApiKey, code)
		http.Get(apiUrl) // Best effort delete
	}

	c.JSON(http.StatusOK, gin.H{"message": "Delete requests sent"})
}

func (h *StreamHGHandler) RenameFile(c *gin.Context) {
	apiKey := c.Query("key")
	code := c.Query("code")
	name := c.Query("name")
	if apiKey == "" || code == "" || name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing parameters"})
		return
	}

	apiUrl := fmt.Sprintf("https://streamhgapi.com/api/file/rename?key=%s&file_code=%s&name=%s", apiKey, code, url.QueryEscape(name))
	resp, err := http.Get(apiUrl)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	var res StreamHGResponse
	json.NewDecoder(resp.Body).Decode(&res)
	c.JSON(http.StatusOK, res)
}

func (h *StreamHGHandler) CreateFolder(c *gin.Context) {
	apiKey := c.Query("key")
	name := c.Query("name")
	if apiKey == "" || name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing parameters"})
		return
	}

	apiUrl := fmt.Sprintf("https://streamhgapi.com/api/folder/create?key=%s&name=%s", apiKey, url.QueryEscape(name))
	resp, err := http.Get(apiUrl)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	var res StreamHGResponse
	json.NewDecoder(resp.Body).Decode(&res)
	c.JSON(http.StatusOK, res)
}

func (h *StreamHGHandler) GetAccountInfo(c *gin.Context) {
	apiKey := c.Query("key")
	if apiKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing key parameter"})
		return
	}

	apiUrl := fmt.Sprintf("https://streamhgapi.com/api/account/info?key=%s", apiKey)
	resp, err := http.Get(apiUrl)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	var res StreamHGResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse StreamHG response"})
		return
	}

	c.JSON(http.StatusOK, res)
}

