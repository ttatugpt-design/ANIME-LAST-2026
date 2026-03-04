package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type VersionHandler struct{}

func NewVersionHandler() *VersionHandler {
	return &VersionHandler{}
}

// GetVersion returns the current API version and build info
func (h *VersionHandler) GetVersion(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"version": "2.0.0",
		"build":   "2026-01-30-final-fix",
		"commit":  "fee94bd",
		"features": []string{
			"localhost_sanitization",
			"relative_urls",
			"env_production",
		},
	})
}
