package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
)

type EpisodeService struct {
	repo port.EpisodeRepository
}

func NewEpisodeService(repo port.EpisodeRepository) *EpisodeService {
	return &EpisodeService{repo: repo}
}

func (s *EpisodeService) Create(episode *domain.Episode) error {
	return s.repo.CreateEpisode(episode)
}

func (s *EpisodeService) GetAll(categoryID uint, letter string, animeType string, order string) ([]domain.Episode, error) {
	return s.repo.GetAllEpisodes(categoryID, letter, animeType, order)
}

func (s *EpisodeService) GetLatest(limit int) ([]domain.Episode, error) {
	return s.repo.GetLatestEpisodes(limit)
}

func (s *EpisodeService) GetByID(id uint) (*domain.Episode, error) {
	return s.repo.GetEpisodeByID(id)
}

func (s *EpisodeService) GetByAnimeID(animeID uint) ([]domain.Episode, error) {
	return s.repo.GetEpisodesByAnimeID(animeID)
}

func (s *EpisodeService) Update(episode *domain.Episode) error {
	return s.repo.UpdateEpisode(episode)
}

func (s *EpisodeService) Delete(id uint) error {
	return s.repo.DeleteEpisode(id)
}

func (s *EpisodeService) Search(query string) ([]domain.Episode, error) {
	return s.repo.SearchEpisodes(query)
}
