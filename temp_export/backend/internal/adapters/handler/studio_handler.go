package handler

import (
	"backend/internal/core/service"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type StudioHandler struct {
	service *service.StudioService
}

func NewStudioHandler(service *service.StudioService) *StudioHandler {
	return &StudioHandler{service: service}
}

func (h *StudioHandler) Create(c *gin.Context) {
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

	s, err := h.service.Create(req.Name, req.NameEn, req.Slug, req.Date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, s)
}

func (h *StudioHandler) GetAll(c *gin.Context) {
	studios, err := h.service.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, studios)
}

func (h *StudioHandler) Update(c *gin.Context) {
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

	s, err := h.service.Update(uint(id), req.Name, req.NameEn, req.Slug, req.Date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, s)
}

func (h *StudioHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Studio deleted"})
}
