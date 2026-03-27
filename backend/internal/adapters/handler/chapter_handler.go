package handler

import (
	"backend/internal/core/domain"
	"backend/internal/core/service"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type ChapterHandler struct {
	service *service.ChapterService
}

func NewChapterHandler(service *service.ChapterService) *ChapterHandler {
	return &ChapterHandler{service: service}
}

func (h *ChapterHandler) sanitizeChapter(c *domain.Chapter) {
	if c == nil {
		return
	}
	// Sanitize Images JSON string or URLs if needed
	// For now, let's just make sure the Images string is handled if it contains localhost
	c.Images = strings.ReplaceAll(c.Images, "http://localhost:8080", "")
}

func (h *ChapterHandler) Create(c *gin.Context) {
	var chapter domain.Chapter
	if err := c.ShouldBindJSON(&chapter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.service.Create(&chapter); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.sanitizeChapter(&chapter)
	c.JSON(http.StatusCreated, chapter)
}

func (h *ChapterHandler) GetAll(c *gin.Context) {
	animeIDStr := c.Query("anime_id")
	chapterNumStr := c.Query("chapter_number")

	if animeIDStr != "" {
		animeID, err := strconv.Atoi(animeIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid anime_id"})
			return
		}

		chapters, err := h.service.GetByAnimeID(uint(animeID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if chapterNumStr != "" {
			chapterNum, err := strconv.Atoi(chapterNumStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chapter_number"})
				return
			}

			for _, ch := range chapters {
				if ch.ChapterNumber == chapterNum {
					h.sanitizeChapter(&ch)
					c.JSON(http.StatusOK, []domain.Chapter{ch})
					return
				}
			}
			c.JSON(http.StatusNotFound, gin.H{"error": "Chapter not found"})
			return
		}

		for i := range chapters {
			h.sanitizeChapter(&chapters[i])
		}
		c.JSON(http.StatusOK, chapters)
		return
	}

	search := c.Query("search")
	paginate := c.Query("paginate") == "true"
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	offset := (page - 1) * limit

	chapters, err := h.service.GetAll(0, search, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for i := range chapters {
		h.sanitizeChapter(&chapters[i])
	}

	if paginate {
		total, _ := h.service.Count(0, search)
		c.JSON(http.StatusOK, gin.H{
			"data":      chapters,
			"total":     total,
			"page":      page,
			"limit":     limit,
			"last_page": (total + int64(limit) - 1) / int64(limit),
		})
		return
	}

	c.JSON(http.StatusOK, chapters)
}

func (h *ChapterHandler) GetByID(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	chapter, err := h.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chapter not found"})
		return
	}
	h.sanitizeChapter(chapter)
	c.JSON(http.StatusOK, chapter)
}

func (h *ChapterHandler) GetByAnimeID(c *gin.Context) {
	animeID, _ := strconv.Atoi(c.Param("animeId"))
	chapters, err := h.service.GetByAnimeID(uint(animeID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range chapters {
		h.sanitizeChapter(&chapters[i])
	}
	c.JSON(http.StatusOK, chapters)
}

func (h *ChapterHandler) Update(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var chapter domain.Chapter
	if err := c.ShouldBindJSON(&chapter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	chapter.ID = uint(id)
	if err := h.service.Update(&chapter); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.sanitizeChapter(&chapter)
	c.JSON(http.StatusOK, chapter)
}

func (h *ChapterHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Chapter deleted"})
}

func (h *ChapterHandler) TrackView(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.service.TrackView(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
