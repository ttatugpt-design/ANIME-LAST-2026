package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

type PCloudHandler struct{}

func NewPCloudHandler() *PCloudHandler {
	return &PCloudHandler{}
}

func (h *PCloudHandler) ProxyListFolder(c *gin.Context) {
	auth := c.Query("auth")
	folderID := c.Query("folderid")

	if auth == "" || folderID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing auth or folderid"})
		return
	}

	// Try EU region first
	url := fmt.Sprintf("https://eapi.pcloud.com/listfolder?folderid=%s&auth=%s", folderID, auth)
	resp, err := http.Get(url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	
	// If failed or not found in EU, try US
	if strings.Contains(string(body), "\"result\": 2000") || strings.Contains(string(body), "\"result\": 1000") {
		url = fmt.Sprintf("https://api.pcloud.com/listfolder?folderid=%s&auth=%s", folderID, auth)
		resp, _ = http.Get(url)
		defer resp.Body.Close()
		body, _ = io.ReadAll(resp.Body)
	}

	c.Data(http.StatusOK, "application/json", body)
}

func (h *PCloudHandler) ProxyGetFileLink(c *gin.Context) {
	auth := c.Query("auth")
	fileID := c.Query("fileid")

	if auth == "" || fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing auth or fileid"})
		return
	}

	url := fmt.Sprintf("https://eapi.pcloud.com/getfilelink?fileid=%s&auth=%s", fileID, auth)
	resp, _ := http.Get(url)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if strings.Contains(string(body), "\"result\": 2000") {
		url = fmt.Sprintf("https://api.pcloud.com/getfilelink?fileid=%s&auth=%s", fileID, auth)
		resp, _ = http.Get(url)
		defer resp.Body.Close()
		body, _ = io.ReadAll(resp.Body)
	}

	c.Data(http.StatusOK, "application/json", body)
}

func (h *PCloudHandler) ProxyLogin(c *gin.Context) {
	user := c.Query("username")
	pass := c.Query("password")

	url := fmt.Sprintf("https://eapi.pcloud.com/userinfo?getauth=1&logout=1&username=%s&password=%s", user, pass)
	resp, _ := http.Get(url)
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if strings.Contains(string(body), "\"result\": 2000") {
		url = fmt.Sprintf("https://api.pcloud.com/userinfo?getauth=1&logout=1&username=%s&password=%s", user, pass)
		resp, _ = http.Get(url)
		defer resp.Body.Close()
		body, _ = io.ReadAll(resp.Body)
	}

	c.Data(http.StatusOK, "application/json", body)
}

func (h *PCloudHandler) ProxyListPublicDrive(c *gin.Context) {
	driveUrl := c.Query("url")
	if driveUrl == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing url"})
		return
	}

	// Ensure it's a filedn.com or pcloud.com link for security
	if !strings.Contains(driveUrl, "filedn.com") && !strings.Contains(driveUrl, "pcloud.com") {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only pCloud/filedn links are allowed"})
		return
	}

	client := &http.Client{}
	req, _ := http.NewRequest("GET", driveUrl, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36")
	
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	htmlSource := string(bodyBytes)

	// The file list is actually in a JSON object inside a script tag: var directLinkData = { ... };
	re := regexp.MustCompile(`var\s+directLinkData\s*=\s*({[\s\S]*?});`)
	match := re.FindStringSubmatch(htmlSource)

	if len(match) < 2 {
		c.JSON(http.StatusOK, gin.H{
			"result": 0,
			"metadata": gin.H{
				"contents": []interface{}{},
			},
		})
		return
	}

	jsonStr := match[1]
	
	// We only need the "content" part, but we can unmarshal the whole thing or a Map
	var data struct {
		Content []struct {
			Name           string `json:"name"`
			UrlEncodedName string `json:"urlencodedname"`
			Modified       string `json:"modified"`
			Icon           int    `json:"icon"`
		} `json:"content"`
	}

	if err := json.Unmarshal([]byte(jsonStr), &data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse drive data: " + err.Error()})
		return
	}

	type FileItem struct {
		Name     string `json:"name"`
		Url      string `json:"url"`
		IsFolder bool   `json:"isfolder"`
	}

	var items []FileItem
	for _, item := range data.Content {
		// Icon 20 usually means folder in pCloud
		isFolder := item.Icon == 20
		
		itemBase := driveUrl
		if !strings.HasSuffix(itemBase, "/") {
			itemBase += "/"
		}
		itemUrl := itemBase + item.UrlEncodedName
		if isFolder {
			itemUrl += "/"
		}

		items = append(items, FileItem{
			Name:     item.Name,
			Url:      itemUrl,
			IsFolder: isFolder,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"result": 0,
		"metadata": gin.H{
			"contents": items,
		},
	})
}

