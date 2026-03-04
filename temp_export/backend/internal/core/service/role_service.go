package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"errors"
)

type RoleService struct {
	repo     port.RoleRepository
	permRepo port.PermissionRepository // Need access to verify/fetch perms
}

func NewRoleService(repo port.RoleRepository, permRepo port.PermissionRepository) *RoleService {
	return &RoleService{repo: repo, permRepo: permRepo}
}

func (s *RoleService) GetAll() ([]domain.Role, error) {
	return s.repo.GetAllRoles()
}

func (s *RoleService) Create(name string, permissionIDs []uint) error {
	existing, _ := s.repo.GetByName(name)
	if existing != nil {
		return errors.New("role already exists")
	}

	role := &domain.Role{Name: name}

	if len(permissionIDs) > 0 {
		var perms []domain.Permission
		for _, id := range permissionIDs {
			// We might need GetPermissionByID. To avoid N+1 queries ideally using Where("id IN ?", ids)
			// But for simplicity/interface limits:
			p, err := s.permRepo.GetPermissionByID(id)
			if err == nil {
				perms = append(perms, *p)
			}
		}
		role.Permissions = perms
	}

	return s.repo.CreateRole(role)
}

func (s *RoleService) Update(id uint, name string, permissionIDs []uint) error {
	role, err := s.repo.GetRoleByID(id)
	if err != nil {
		return err
	}

	role.Name = name

	// Update permissions
	// Note: If permissionIDs is nil, do we wipe them? Or keep existing?
	// Usually Update replaces fully. If empty slice passed, it clears permissions.
	// If the frontend always sends the full list, this is fine.
	var perms []domain.Permission
	for _, pid := range permissionIDs {
		p, err := s.permRepo.GetPermissionByID(pid)
		if err == nil {
			perms = append(perms, *p)
		}
	}
	role.Permissions = perms

	return s.repo.UpdateRole(role)
}

func (s *RoleService) Delete(id uint) error {
	return s.repo.DeleteRole(id)
}

func (s *RoleService) Search(query string) ([]domain.Role, error) {
	return s.repo.SearchRoles(query)
}
