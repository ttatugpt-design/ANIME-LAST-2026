package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
)

type PermissionService struct {
	repo port.PermissionRepository
}

func NewPermissionService(repo port.PermissionRepository) *PermissionService {
	return &PermissionService{repo: repo}
}

func (s *PermissionService) GetAll() ([]domain.Permission, error) {
	return s.repo.GetAllPermissions()
}

func (s *PermissionService) Create(key, description string) error {
	perm := &domain.Permission{
		Key:         key,
		Description: description,
	}
	return s.repo.CreatePermission(perm)
}

func (s *PermissionService) Update(id uint, key, description string) error {
	perm, err := s.repo.GetPermissionByID(id)
	if err != nil {
		return err
	}
	perm.Key = key
	perm.Description = description
	return s.repo.UpdatePermission(perm)
}

func (s *PermissionService) Delete(id uint) error {
	return s.repo.DeletePermission(id)
}

func (s *PermissionService) Search(query string) ([]domain.Permission, error) {
	return s.repo.SearchPermissions(query)
}
