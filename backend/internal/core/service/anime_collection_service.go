package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"time"
)

type AnimeCollectionService struct {
	repo port.AnimeCollectionRepository
}

func NewAnimeCollectionService(repo port.AnimeCollectionRepository) *AnimeCollectionService {
	return &AnimeCollectionService{repo: repo}
}

func (s *AnimeCollectionService) Create(collection *domain.AnimeCollection) (*domain.AnimeCollection, error) {
	collection.CreatedAt = time.Now()
	collection.UpdatedAt = time.Now()
	if err := s.repo.CreateAnimeCollection(collection); err != nil {
		return nil, err
	}
	return collection, nil
}

func (s *AnimeCollectionService) GetByID(id uint) (*domain.AnimeCollection, error) {
	return s.repo.GetAnimeCollectionByID(id)
}

func (s *AnimeCollectionService) GetByAnimeID(animeID uint) ([]domain.AnimeCollection, error) {
	return s.repo.GetAnimeCollectionsByAnimeID(animeID)
}

func (s *AnimeCollectionService) GetAll(search string) ([]domain.AnimeCollection, error) {
	return s.repo.GetAllAnimeCollections(search)
}

func (s *AnimeCollectionService) Update(collection *domain.AnimeCollection) (*domain.AnimeCollection, error) {
	collection.UpdatedAt = time.Now()
	if err := s.repo.UpdateAnimeCollection(collection); err != nil {
		return nil, err
	}
	return collection, nil
}

func (s *AnimeCollectionService) Delete(id uint) error {
	return s.repo.DeleteAnimeCollection(id)
}
