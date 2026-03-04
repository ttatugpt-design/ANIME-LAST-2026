package handler

import (
	"backend/internal/core/port"
	"net/http"

	"github.com/gin-gonic/gin"
)

type SearchHandler struct {
	userRepo port.UserRepository
	roleRepo port.RoleRepository
	permRepo port.PermissionRepository
}

func NewSearchHandler(u port.UserRepository, r port.RoleRepository, p port.PermissionRepository) *SearchHandler {
	return &SearchHandler{
		userRepo: u,
		roleRepo: r,
		permRepo: p,
	}
}

func (h *SearchHandler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusOK, gin.H{"users": []string{}, "roles": []string{}, "permissions": []string{}})
		return
	}

	users, _ := h.userRepo.SearchUsers(query)
	roles, _ := h.roleRepo.SearchRoles(query)
	perms, _ := h.permRepo.SearchPermissions(query)

	c.JSON(http.StatusOK, gin.H{
		"users":       users,
		"roles":       roles,
		"permissions": perms,
	})
}
