package handler

import (
	"backend/internal/core/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type TypeHandler struct {
	service *service.TypeService
}

func NewTypeHandler(service *service.TypeService) *TypeHandler {
	return &TypeHandler{service: service}
}

func (h *TypeHandler) Create(c *gin.Context) {
	var req struct {
		Name   string `json:"name" binding:"required"`
		NameEn string `json:"name_en" binding:"required"`
		Slug   string `json:"slug" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	t, err := h.service.Create(req.Name, req.NameEn, req.Slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, t)
}

func (h *TypeHandler) GetAll(c *gin.Context) {
	types, err := h.service.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, types)
}

func (h *TypeHandler) Update(c *gin.Context) {
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

	t, err := h.service.Update(uint(id), req.Name, req.NameEn, req.Slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, t)
}

func (h *TypeHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Type deleted"})
}
