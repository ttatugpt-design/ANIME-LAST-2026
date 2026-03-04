package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"time"
)

type WatchLaterService struct {
	repo port.WatchLaterRepository
}

func NewWatchLaterService(repo port.WatchLaterRepository) *WatchLaterService {
	return &WatchLaterService{repo: repo}
}

func (s *WatchLaterService) Toggle(userID uint, animeID *uint, episodeID *uint) (bool, error) {
	exists, err := s.repo.IsWatchLater(userID, animeID, episodeID)
	if err != nil {
		return false, err
	}

	if exists {
		err = s.repo.RemoveFromWatchLater(userID, animeID, episodeID)
		return false, err
	} else {
		entry := &domain.WatchLater{
			UserID:    userID,
			AnimeID:   animeID,
			EpisodeID: episodeID,
			CreatedAt: time.Now(),
		}
		err = s.repo.AddToWatchLater(entry)
		return true, err // true means added
	}
}

func (s *WatchLaterService) GetByUser(userID uint) ([]domain.WatchLater, error) {
	return s.repo.GetWatchLaterByUser(userID)
}

func (s *WatchLaterService) IsSaved(userID uint, animeID *uint, episodeID *uint) (bool, error) {
	return s.repo.IsWatchLater(userID, animeID, episodeID)
}
