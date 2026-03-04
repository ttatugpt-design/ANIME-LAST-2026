package handler

import (
	"backend/internal/core/domain"
	"backend/internal/core/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type PermissionHandler struct {
	service *service.PermissionService
}

func NewPermissionHandler(service *service.PermissionService) *PermissionHandler {
	return &PermissionHandler{service: service}
}

func (h *PermissionHandler) GetAll(c *gin.Context) {
	query := c.Query("q")
	var perms []domain.Permission
	var err error

	if query != "" {
		perms, err = h.service.Search(query)
	} else {
		perms, err = h.service.GetAll()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, perms)
}

func (h *PermissionHandler) Create(c *gin.Context) {
	var req struct {
		Key         string `json:"key" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.Create(req.Key, req.Description); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Permission created"})
}

func (h *PermissionHandler) Update(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req struct {
		Key         string `json:"key" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.Update(uint(id), req.Key, req.Description); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Permission updated"})
}

func (h *PermissionHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Permission deleted"})
}
