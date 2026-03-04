package handler

import (
	"backend/internal/core/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type SeasonHandler struct {
	service *service.SeasonService
}

func NewSeasonHandler(service *service.SeasonService) *SeasonHandler {
	return &SeasonHandler{service: service}
}

func (h *SeasonHandler) Create(c *gin.Context) {
	var req struct {
		Name   string `json:"name" binding:"required"`
		NameEn string `json:"name_en" binding:"required"`
		Slug   string `json:"slug" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	s, err := h.service.Create(req.Name, req.NameEn, req.Slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, s)
}

func (h *SeasonHandler) GetAll(c *gin.Context) {
	seasons, err := h.service.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, seasons)
}

func (h *SeasonHandler) Update(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req struct {
		Name   string `json:"name" binding:"required"`
		NameEn string `json:"name_en" binding:"required"`
		Slug   string `json:"slug" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	s, err := h.service.Update(uint(id), req.Name, req.NameEn, req.Slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, s)
}

func (h *SeasonHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Season deleted"})
}
