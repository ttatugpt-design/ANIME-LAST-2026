package handler

import (
	"backend/internal/core/domain"
	"backend/internal/core/service"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type QuickNewsHandler struct {
	service *service.QuickNewsService
	baseDir string
}

func NewQuickNewsHandler(service *service.QuickNewsService, baseDir string) *QuickNewsHandler {
	return &QuickNewsHandler{service: service, baseDir: baseDir}
}

func (h *QuickNewsHandler) Create(c *gin.Context) {
	description := c.PostForm("description")
	descriptionEn := c.PostForm("description_en")
	url := c.PostForm("url")
	urlEn := c.PostForm("url_en")

	if description == "" || descriptionEn == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "description and description_en are required"})
		return
	}

	var imagePath string
	file, err := c.FormFile("image")
	if err == nil {
		uploadDir := filepath.Join(h.baseDir, "backend", "uploads", "quick_news")
		if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
			os.MkdirAll(uploadDir, 0755)
		}
		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), filepath.Base(file.Filename))
		destPath := filepath.Join(uploadDir, filename)
		if err := c.SaveUploadedFile(file, destPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
			return
		}
		imagePath = fmt.Sprintf("/uploads/quick_news/%s", filename)
	}

	news := domain.QuickNews{
		Description:   description,
		DescriptionEn: descriptionEn,
		Image:         imagePath,
		URL:           url,
		URLEn:         urlEn,
	}

	if err := h.service.Create(&news); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, news)
}

func (h *QuickNewsHandler) GetAll(c *gin.Context) {
	news, err := h.service.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, news)
}

func (h *QuickNewsHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	news, err := h.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "News not found"})
		return
	}

	description := c.PostForm("description")
	descriptionEn := c.PostForm("description_en")
	url := c.PostForm("url")
	urlEn := c.PostForm("url_en")

	if description != "" {
		news.Description = description
	}
	if descriptionEn != "" {
		news.DescriptionEn = descriptionEn
	}
	
	// Allow empty URLs
	news.URL = url
	news.URLEn = urlEn

	file, err := c.FormFile("image")
	if err == nil {
		uploadDir := filepath.Join(h.baseDir, "backend", "uploads", "quick_news")
		if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
			os.MkdirAll(uploadDir, 0755)
		}
		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), filepath.Base(file.Filename))
		destPath := filepath.Join(uploadDir, filename)
		if err := c.SaveUploadedFile(file, destPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
			return
		}
		news.Image = fmt.Sprintf("/uploads/quick_news/%s", filename)
	}

	if err := h.service.Update(news); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, news)
}

func (h *QuickNewsHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	if err := h.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "News deleted"})
}
