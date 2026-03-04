package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
)

type TypeService struct {
	repo port.TypeRepository
}

func NewTypeService(repo port.TypeRepository) *TypeService {
	return &TypeService{repo: repo}
}

func (s *TypeService) Create(name, nameEn, slug string) (*domain.Type, error) {
	t := &domain.Type{
		Name:     name,
		NameEn:   nameEn,
		Slug:     slug,
		IsActive: true,
	}
	if err := s.repo.CreateType(t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *TypeService) GetAll() ([]domain.Type, error) {
	return s.repo.GetAllTypes()
}

func (s *TypeService) GetByID(id uint) (*domain.Type, error) {
	return s.repo.GetTypeByID(id)
}

func (s *TypeService) Update(id uint, name, nameEn, slug string) (*domain.Type, error) {
	t, err := s.repo.GetTypeByID(id)
	if err != nil {
		return nil, err
	}

	t.Name = name
	t.NameEn = nameEn
	t.Slug = slug

	if err := s.repo.UpdateType(t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *TypeService) Delete(id uint) error {
	return s.repo.DeleteType(id)
}
