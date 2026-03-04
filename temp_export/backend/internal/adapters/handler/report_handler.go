package handler

import (
	"net/http"

	"backend/internal/adapters/repository"
	"backend/internal/core/domain"

	"github.com/gin-gonic/gin"
)

type ReportHandler struct {
	repo *repository.ReportRepository
}

func NewReportHandler(repo *repository.ReportRepository) *ReportHandler {
	return &ReportHandler{repo: repo}
}

func (h *ReportHandler) CreateReport(c *gin.Context) {
	var report domain.Report
	if err := c.ShouldBindJSON(&report); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if report.ProblemType == "" || report.Description == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Problem type and description are required"})
		return
	}

	if err := h.repo.CreateReport(c.Request.Context(), &report); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create report"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Report submitted successfully"})
}

func (h *ReportHandler) GetAllReports(c *gin.Context) {
	reports, err := h.repo.GetAllReports(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reports"})
		return
	}

	c.JSON(http.StatusOK, reports)
}
