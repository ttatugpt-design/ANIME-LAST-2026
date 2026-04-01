package handler

import (
	"backend/internal/core/domain"
	"backend/internal/core/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type EmbedAccountHandler struct {
	svc *service.EmbedAccountService
}

func NewEmbedAccountHandler(svc *service.EmbedAccountService) *EmbedAccountHandler {
	return &EmbedAccountHandler{svc: svc}
}

func (h *EmbedAccountHandler) Create(c *gin.Context) {
	var acc domain.EmbedAccount
	if err := c.ShouldBindJSON(&acc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.Create(&acc); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, acc)
}

func (h *EmbedAccountHandler) GetAll(c *gin.Context) {
	accs, err := h.svc.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, accs)
}

func (h *EmbedAccountHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var acc domain.EmbedAccount
	if err := c.ShouldBindJSON(&acc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	acc.ID = uint(id)

	if err := h.svc.Update(&acc); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, acc)
}

func (h *EmbedAccountHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.svc.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Account deleted"})
}

func (h *EmbedAccountHandler) Export(c *gin.Context) {
	accs, err := h.svc.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Header("Content-Disposition", "attachment; filename=embed_accounts_backup.json")
	c.JSON(http.StatusOK, accs)
}

func (h *EmbedAccountHandler) Import(c *gin.Context) {
	var accs []domain.EmbedAccount
	if err := c.ShouldBindJSON(&accs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid format. Expected JSON array of accounts."})
		return
	}

	count := 0
	for _, acc := range accs {
		// Clear ID for new creation or handle as upsert.
		// Since we want to merge, we'll try to create it.
		// If ID is provided, GORM might try to update.
		// To be safe, we'll clear ID if 0 or handle it as new if it doesn't exist.
		existing, _ := h.svc.GetByID(acc.ID)
		if existing != nil && acc.ID != 0 {
			h.svc.Update(&acc)
		} else {
			acc.ID = 0
			h.svc.Create(&acc)
		}
		count++
	}

	c.JSON(http.StatusOK, gin.H{"message": "Import successful", "count": count})
}
