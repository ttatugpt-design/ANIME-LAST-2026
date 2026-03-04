package service

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type AIService struct {
	apiKey string
}

func NewAIService(apiKey string) *AIService {
	return &AIService{
		apiKey: apiKey,
	}
}

// Keep TripoData struct for frontend compatibility
type TripoData struct {
	TaskID   string `json:"task_id"`
	Status   string `json:"status"` // QUEUED, RUNNING, SUCCESS, FAILED, CANCELLED
	Progress int    `json:"progress"`
	Result   struct {
		Model struct {
			Url string `json:"url"` // .glb url
		} `json:"model"`
	} `json:"result"`
}

type MeshyGenerateReq struct {
	ImageUrl  string `json:"image_url"`
	EnablePBR bool   `json:"enable_pbr"`
	Prompt    string `json:"prompt,omitempty"`
}

type MeshyGenerateResp struct {
	Result string `json:"result"`  // Task ID
	Error  string `json:"message"` // Error message if any
}

type MeshyTaskResp struct {
	Id        string `json:"id"`
	Status    string `json:"status"` // SUCCEEDED, FAILED, IN_PROGRESS, PENDING
	Progress  int    `json:"progress"`
	ModelUrls struct {
		Glb string `json:"glb"`
	} `json:"model_urls"`
}

func (s *AIService) Generate3DModel(imagePath string, prompt string) (string, error) {
	fmt.Println("Starting 3D Generation (Meshy)...")
	if s.apiKey == "" {
		return "", fmt.Errorf("MESHY_API_KEY is not set")
	}

	// 1. Read file and convert to Base64 Data URI
	fileBytes, err := os.ReadFile(imagePath)
	if err != nil {
		return "", err
	}

	// Determine mime type
	ext := filepath.Ext(imagePath)
	mimeType := "image/jpeg"
	if ext == ".png" {
		mimeType = "image/png"
	} else if ext == ".jpg" || ext == ".jpeg" {
		mimeType = "image/jpeg"
	}

	base64Str := base64.StdEncoding.EncodeToString(fileBytes)
	dataURI := fmt.Sprintf("data:%s;base64,%s", mimeType, base64Str)

	// 2. Prepare Request
	payload := MeshyGenerateReq{
		ImageUrl:  dataURI,
		EnablePBR: true,
		Prompt:    prompt,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	url := "https://api.meshy.ai/v1/image-to-3d"
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	// 3. Send
	client := &http.Client{Timeout: 60 * time.Second} // Upload might take longer for base64
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Meshy API Network Error: %v\n", err)
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Printf("Meshy API Response Status: %s\n", resp.Status)
	fmt.Printf("Meshy API Response Body: %s\n", string(respBody))

	if resp.StatusCode != http.StatusAccepted && resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("meshy api error: %s", string(respBody))
	}

	var result MeshyGenerateResp
	if err := json.NewDecoder(bytes.NewReader(respBody)).Decode(&result); err != nil {
		return "", err
	}

	if result.Result == "" {
		// Try parsing generic error if structure differs
		return "", fmt.Errorf("meshy api returned no task ID")
	}

	return result.Result, nil
}

// Reuse TripoData struct name for compatibility with handler or refactor handler
// To minimize changes, I will return TripoData but mapped from Meshy response
func (s *AIService) CheckTaskStatus(taskID string) (*TripoData, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("MESHY_API_KEY is not set")
	}

	url := fmt.Sprintf("https://api.meshy.ai/v1/image-to-3d/%s", taskID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result MeshyTaskResp
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	// Map Meshy status to our internal status constants (QUEUED, RUNNING, SUCCESS, FAILED)
	// Meshy: PENDING, IN_PROGRESS, SUCCEEDED, FAILED, EXPIRED
	status := "QUEUED"
	switch result.Status {
	case "PENDING":
		status = "QUEUED"
	case "IN_PROGRESS":
		status = "RUNNING"
	case "SUCCEEDED":
		status = "SUCCESS"
	case "FAILED", "EXPIRED":
		status = "FAILED"
	}

	// Map to TripoData structure expected by frontend
	data := &TripoData{
		TaskID:   result.Id,
		Status:   status,
		Progress: result.Progress,
	}
	data.Result.Model.Url = result.ModelUrls.Glb

	return data, nil
}
