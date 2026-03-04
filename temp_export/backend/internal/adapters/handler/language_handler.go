package handler

import (
	"backend/internal/core/service"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type LanguageHandler struct {
	service *service.LanguageService
}

func NewLanguageHandler(service *service.LanguageService) *LanguageHandler {
	return &LanguageHandler{service: service}
}

func (h *LanguageHandler) Create(c *gin.Context) {
	var req struct {
		Name   string     `json:"name" binding:"required"`
		NameEn string     `json:"name_en" binding:"required"`
		Slug   string     `json:"slug" binding:"required"`
		Date   *time.Time `json:"date"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	l, err := h.service.Create(req.Name, req.NameEn, req.Slug, req.Date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, l)
}

func (h *LanguageHandler) GetAll(c *gin.Context) {
	languages, err := h.service.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, languages)
}

func (h *LanguageHandler) Update(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req struct {
		Name   string     `json:"name" binding:"required"`
		NameEn string     `json:"name_en" binding:"required"`
		Slug   string     `json:"slug" binding:"required"`
		Date   *time.Time `json:"date"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	l, err := h.service.Update(uint(id), req.Name, req.NameEn, req.Slug, req.Date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, l)
}

func (h *LanguageHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Language deleted"})
}
