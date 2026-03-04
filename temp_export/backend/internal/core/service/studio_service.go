package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"time"
)

type StudioService struct {
	repo port.StudioRepository
}

func NewStudioService(repo port.StudioRepository) *StudioService {
	return &StudioService{repo: repo}
}

func (s *StudioService) Create(name, nameEn, slug string, date *time.Time) (*domain.Studio, error) {
	studio := &domain.Studio{
		Name:     name,
		NameEn:   nameEn,
		Slug:     slug,
		Date:     date,
		IsActive: true,
	}
	if err := s.repo.CreateStudio(studio); err != nil {
		return nil, err
	}
	return studio, nil
}

func (s *StudioService) GetAll() ([]domain.Studio, error) {
	return s.repo.GetAllStudios()
}

func (s *StudioService) GetByID(id uint) (*domain.Studio, error) {
	return s.repo.GetStudioByID(id)
}

func (s *StudioService) Update(id uint, name, nameEn, slug string, date *time.Time) (*domain.Studio, error) {
	studio, err := s.repo.GetStudioByID(id)
	if err != nil {
		return nil, err
	}

	studio.Name = name
	studio.NameEn = nameEn
	studio.Slug = slug
	studio.Date = date

	if err := s.repo.UpdateStudio(studio); err != nil {
		return nil, err
	}
	return studio, nil
}

func (s *StudioService) Delete(id uint) error {
	return s.repo.DeleteStudio(id)
}
