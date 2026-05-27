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

type SequentialAssignRequest struct {
	AnimeID    uint     `json:"anime_id"`
	SourceType string   `json:"source_type"` // pcloud, doodstream, streamhg
	Links      []string `json:"links"`
}

func (h *AutomationHandler) AssignLinksSequentially(c *gin.Context) {
	var req SequentialAssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fmt.Printf("[AUTOMATION] Sequential Assign for Anime %d, Source: %s, Links: %d\n", req.AnimeID, req.SourceType, len(req.Links))

	// Get all episodes for this anime ordered by number ASC
	episodes, err := h.episodeSvc.GetByAnimeID(req.AnimeID, 1000, 0) // Assume max 1000 episodes
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch episodes"})
		return
	}

	// Sort episodes by number just in case the service doesn't guarantee it
	// (Actually we should trust the service or handle it if needed)

	count := 0
	for i, link := range req.Links {
		if i >= len(episodes) {
			break
		}

		ep := episodes[i]
		formattedLink := link
		serverName := ""
		serverType := "embed"

		switch strings.ToLower(req.SourceType) {
		case "pcloud":
			serverName = "pCloud"
			serverType = "direct"
		case "doodstream", "dood":
			serverName = "DoodStream"
			serverType = "embed"
			if !strings.HasPrefix(link, "http") {
				formattedLink = fmt.Sprintf("https://dood.li/e/%s", link)
			}
		case "streamhg", "hg":
			serverName = "StreamHG"
			serverType = "embed"
			if !strings.HasPrefix(link, "http") {
				formattedLink = fmt.Sprintf("https://hgcloud.to/e/%s", link)
			}
		default:
			// Fallback if type is unknown but we have a link
			serverName = "Other"
			if strings.Contains(link, "pcloud") || strings.Contains(link, "filedn") {
				serverName = "pCloud"
				serverType = "direct"
			}
		}

		if serverName == "" {
			continue
		}

		err := h.linkServerToEpisode(ep.ID, serverName, formattedLink, serverType)
		if err == nil {
			count++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   fmt.Sprintf("تم ربط %d حلقة بنجاح بالتسلسل!", count),
		"processed": count,
	})
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
			h.linkServerToEpisode(episode.ID, "DoodStream", fmt.Sprintf("https://dood.li/e/%s", item.DoodCode), "embed")
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
