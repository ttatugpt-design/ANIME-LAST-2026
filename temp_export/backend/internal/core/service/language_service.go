package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"time"
)

type LanguageService struct {
	repo port.LanguageRepository
}

func NewLanguageService(repo port.LanguageRepository) *LanguageService {
	return &LanguageService{repo: repo}
}

func (s *LanguageService) Create(name, nameEn, slug string, date *time.Time) (*domain.Language, error) {
	lang := &domain.Language{
		Name:     name,
		NameEn:   nameEn,
		Slug:     slug,
		Date:     date,
		IsActive: true,
	}
	if err := s.repo.CreateLanguage(lang); err != nil {
		return nil, err
	}
	return lang, nil
}

func (s *LanguageService) GetAll() ([]domain.Language, error) {
	return s.repo.GetAllLanguages()
}

func (s *LanguageService) GetByID(id uint) (*domain.Language, error) {
	return s.repo.GetLanguageByID(id)
}

func (s *LanguageService) Update(id uint, name, nameEn, slug string, date *time.Time) (*domain.Language, error) {
	lang, err := s.repo.GetLanguageByID(id)
	if err != nil {
		return nil, err
	}

	lang.Name = name
	lang.NameEn = nameEn
	lang.Slug = slug
	lang.Date = date

	if err := s.repo.UpdateLanguage(lang); err != nil {
		return nil, err
	}
	return lang, nil
}

func (s *LanguageService) Delete(id uint) error {
	return s.repo.DeleteLanguage(id)
}
