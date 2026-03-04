package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
)

type SeasonService struct {
	repo port.SeasonRepository
}

func NewSeasonService(repo port.SeasonRepository) *SeasonService {
	return &SeasonService{repo: repo}
}

func (s *SeasonService) Create(name, nameEn, slug string) (*domain.Season, error) {
	season := &domain.Season{
		Name:     name,
		NameEn:   nameEn,
		Slug:     slug,
		IsActive: true,
	}
	if err := s.repo.CreateSeason(season); err != nil {
		return nil, err
	}
	return season, nil
}

func (s *SeasonService) GetAll() ([]domain.Season, error) {
	return s.repo.GetAllSeasons()
}

func (s *SeasonService) GetByID(id uint) (*domain.Season, error) {
	return s.repo.GetSeasonByID(id)
}

func (s *SeasonService) Update(id uint, name, nameEn, slug string) (*domain.Season, error) {
	season, err := s.repo.GetSeasonByID(id)
	if err != nil {
		return nil, err
	}

	season.Name = name
	season.NameEn = nameEn
	season.Slug = slug

	if err := s.repo.UpdateSeason(season); err != nil {
		return nil, err
	}
	return season, nil
}

func (s *SeasonService) Delete(id uint) error {
	return s.repo.DeleteSeason(id)
}
