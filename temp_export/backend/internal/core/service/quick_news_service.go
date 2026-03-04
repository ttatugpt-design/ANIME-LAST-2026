package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
)

type QuickNewsService struct {
	repo port.QuickNewsRepository
}

func NewQuickNewsService(repo port.QuickNewsRepository) *QuickNewsService {
	return &QuickNewsService{repo: repo}
}

func (s *QuickNewsService) Create(news *domain.QuickNews) error {
	return s.repo.Create(news)
}

func (s *QuickNewsService) GetByID(id uint) (*domain.QuickNews, error) {
	return s.repo.GetByID(id)
}

func (s *QuickNewsService) GetAll() ([]domain.QuickNews, error) {
	return s.repo.GetAll()
}

func (s *QuickNewsService) Update(news *domain.QuickNews) error {
	return s.repo.Update(news)
}

func (s *QuickNewsService) Delete(id uint) error {
	return s.repo.Delete(id)
}
