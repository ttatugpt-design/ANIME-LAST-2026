package handler

import (
	"backend/internal/core/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ModelHandler struct {
	service *service.ModelService
}

func NewModelHandler(service *service.ModelService) *ModelHandler {
	return &ModelHandler{service: service}
}

func (h *ModelHandler) Upload(c *gin.Context) {
	name := c.PostForm("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	// Parse optional image
	image, _ := c.FormFile("image")
	miniBlur, _ := c.FormFile("mini_blur")

	title := c.PostForm("title")
	category := c.PostForm("category")

	model, err := h.service.Upload(name, title, file, image, miniBlur, category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, model)
}

func (h *ModelHandler) GetAll(c *gin.Context) {
	models, err := h.service.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, models)
}

func (h *ModelHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Model deleted"})
}

func (h *ModelHandler) Update(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	name := c.PostForm("name")
	title := c.PostForm("title")
	category := c.PostForm("category")
	image, _ := c.FormFile("image")
	miniBlur, _ := c.FormFile("mini_blur")

	model, err := h.service.Update(uint(id), name, title, image, miniBlur, category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model)
}

func (h *ModelHandler) Download(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	model, err := h.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Model not found"})
		return
	}

	// Sanitize filename or just use model.Name + ext
	// model.Path is relative "uploads/models/xxxxx.fbx"
	c.FileAttachment(model.Path, model.Name+"."+model.Type)
}
