package handler

import (
	"backend/internal/core/domain"
	"backend/internal/core/service"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type AutomationHandler struct {
	episodeSvc *service.EpisodeService
}

func NewAutomationHandler(episodeSvc *service.EpisodeService) *AutomationHandler {
	return &AutomationHandler{episodeSvc: episodeSvc}
}

type SyncItem struct {
	Filename string `json:"filename"`
	PCloudURL string `json:"pcloud_url"`
	HGCode   string `json:"hg_code"`
	DoodCode string `json:"dood_code"`
}

type SyncRequest struct {
	AnimeID uint       `json:"anime_id"`
	Items   []SyncItem `json:"items"`
}

func (h *AutomationHandler) SyncEpisodes(c *gin.Context) {
	fmt.Println("===========================================")
	fmt.Println("[AUTOMATION] SYNC PROCESS BEGUN")
	var req SyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results := []gin.H{}

	for _, item := range req.Items {
		epNum := h.extractEpisodeNumber(item.Filename)
		if epNum == 0 {
			continue
		}

		episode, err := h.episodeSvc.GetByAnimeAndNumber(req.AnimeID, epNum)
		if err != nil {
			fmt.Printf("[AUTOMATION] SKIP: Episode %d not found for Anime %d\n", epNum, req.AnimeID)
			continue
		}

		// Update Servers
		if item.PCloudURL != "" {
			h.linkServerToEpisode(episode.ID, "pCloud", item.PCloudURL, "direct")
		}
		if item.HGCode != "" {
			h.linkServerToEpisode(episode.ID, "StreamHG", fmt.Sprintf("https://hgcloud.to/e/%s", item.HGCode), "embed")
		}
		if item.DoodCode != "" {
			h.linkServerToEpisode(episode.ID, "DoodStream", fmt.Sprintf("https://myvidplay.com/e/%s", item.DoodCode), "embed")
		}

		results = append(results, gin.H{"episode": epNum, "status": "linked"})
	}

	fmt.Println("[AUTOMATION] SYNC PROCESS COMPLETE")
	fmt.Println("===========================================")

	c.JSON(http.StatusOK, gin.H{
		"message":   fmt.Sprintf("تم ربط %d حلقة بنجاح!", len(results)),
		"processed": len(results),
	})
}

// Helper methods from previous versions (refined)

func (h *AutomationHandler) extractEpisodeNumber(filename string) int {
	base := filename
	if idx := strings.LastIndex(filename, "."); idx != -1 {
		base = filename[:idx]
	}

	rePattern := regexp.MustCompile(`(?i)(?:ep|episode|e|حلقة|الحلقة)\s*(\d+)`)
	pMatches := rePattern.FindStringSubmatch(base)
	if len(pMatches) > 1 {
		num, _ := strconv.Atoi(pMatches[1])
		return num
	}

	reAll := regexp.MustCompile(`(\d+)`)
	allMatches := reAll.FindAllString(base, -1)
	if len(allMatches) > 0 {
		num, _ := strconv.Atoi(allMatches[len(allMatches)-1])
		return num
	}
	return 0
}

func (h *AutomationHandler) linkServerToEpisode(episodeID uint, name string, url string, serverType string) error {
	ep, err := h.episodeSvc.GetByID(episodeID)
	if err != nil {
		return err
	}

	newServers := []domain.EpisodeServer{}
	for _, s := range ep.Servers {
		if s.Name != name {
			newServers = append(newServers, s)
		}
	}
	newServers = append(newServers, domain.EpisodeServer{
		EpisodeID: episodeID,
		Name:      name,
		URL:       url,
		Type:      serverType,
		Language:  "ar",
	})

	ep.Servers = newServers
	return h.episodeSvc.Update(ep)
}
