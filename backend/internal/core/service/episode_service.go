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

func (s *EpisodeService) GetAll(animeID uint, categoryID uint, letter string, search string, animeType string, order string, limit int, offset int) ([]domain.Episode, error) {
	return s.repo.GetAllEpisodes(animeID, categoryID, letter, search, animeType, order, limit, offset)
}

func (s *EpisodeService) Count(animeID uint, categoryID uint, letter string, search string, animeType string) (int64, error) {
	return s.repo.CountEpisodes(animeID, categoryID, letter, search, animeType)
}

func (s *EpisodeService) GetLatest(limit, offset int) ([]domain.Episode, error) {
	return s.repo.GetLatestEpisodes(limit, offset)
}

func (s *EpisodeService) GetByID(id uint) (*domain.Episode, error) {
	return s.repo.GetEpisodeByID(id)
}

func (s *EpisodeService) GetByAnimeAndNumber(animeID uint, episodeNumber int) (*domain.Episode, error) {
	return s.repo.GetEpisodeByAnimeAndNumber(animeID, episodeNumber)
}

func (s *EpisodeService) GetByAnimeID(animeID uint, limit, offset int) ([]domain.Episode, error) {
	return s.repo.GetEpisodesByAnimeID(animeID, limit, offset)
}

func (s *EpisodeService) CountByAnimeID(animeID uint) (int64, error) {
	return s.repo.CountEpisodesByAnimeID(animeID)
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
