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
	// Panic Recovery to catch 500 errors and log them
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("[CRITICAL PANIC] pCloud Handler: %v\n", r)
			c.AbortWithStatusJSON(500, gin.H{"error": "Server Panic", "details": fmt.Sprintf("%v", r)})
		}
	}()

	driveUrl := c.Query("url")
	if driveUrl == "" {
		c.AbortWithStatusJSON(400, gin.H{"error": "Missing url"})
		return
	}

	// Clean URL: remove double slashes (except after http:)
	driveUrl = regexp.MustCompile(`([^:])//+`).ReplaceAllString(driveUrl, "$1/")
	fmt.Printf("[pCloud] Fetching URL: %s\n", driveUrl)

	// Ensure it's a filedn.com or pcloud.com link for security
	if !strings.Contains(driveUrl, "filedn.com") && !strings.Contains(driveUrl, "pcloud.com") {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Only pCloud/filedn links are allowed"})
		return
	}

	client := &http.Client{}
	req, err := http.NewRequest("GET", driveUrl, nil)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid URL format"})
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36")
	
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("[pCloud] Request Error: %v\n", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Connection failed"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("[pCloud] Bad Status: %d\n", resp.StatusCode)
		c.AbortWithStatusJSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("pCloud returned status %d", resp.StatusCode)})
		return
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to read pCloud response"})
		return
	}
	htmlSource := string(bodyBytes)
	fmt.Printf("[pCloud] Received HTML size: %d\n", len(htmlSource))

	// Search for data using multiple patterns
	var jsonStr string
	patterns := []string{
		`directLinkData\s*=\s*({[\s\S]*?});\s*(\n|$)`,       // Pattern 1: stops at };
		`directLinkData\s*=\s*({[\s\S]*});?\s*<\/script>`,   // Pattern 2: greedy until script end
		`"content":\s*(\[[\s\S]*?\])`,                       // Pattern 3: content array fallback
	}

	for i, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		match := re.FindStringSubmatch(htmlSource)
		if len(match) >= 2 {
			if i == 2 { // Fallback pattern for content array
				jsonStr = "{\"content\":" + match[1] + "}"
			} else {
				jsonStr = match[1]
			}
			fmt.Printf("[pCloud] Data found using pattern #%d\n", i+1)
			break
		}
	}

	if jsonStr == "" {
		fmt.Println("[pCloud] Error: No data found in HTML")
		c.JSON(http.StatusOK, gin.H{"result": 0, "metadata": gin.H{"contents": []interface{}{}}})
		return
	}

	var data struct {
		Content []struct {
			Name           string `json:"name"`
			UrlEncodedName string `json:"urlencodedname"`
			Modified       string `json:"modified"`
			Icon           int    `json:"icon"`
		} `json:"content"`
	}

	if err := json.Unmarshal([]byte(jsonStr), &data); err != nil {
		fmt.Printf("[pCloud] JSON Error: %v\n", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Data parsing error"})
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

	fmt.Printf("[pCloud] Successfully parsed %d items\n", len(items))
	c.JSON(http.StatusOK, gin.H{
		"result": 0,
		"metadata": gin.H{
			"contents": items,
		},
	})
}

