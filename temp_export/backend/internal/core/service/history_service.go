package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"fmt"
)

type HistoryService struct {
	repo port.HistoryRepository
}

func NewHistoryService(repo port.HistoryRepository) *HistoryService {
	return &HistoryService{repo: repo}
}

func (s *HistoryService) Track(userID uint, activityType domain.ActivityType, episodeID, animeID, commentID *uint, image string) error {
	// DEBUG LOGGING
	fmt.Printf("\n=== HISTORY SERVICE TRACK ===\n")
	fmt.Printf("UserID: %d\n", userID)
	fmt.Printf("ActivityType: %s\n", activityType)
	if episodeID != nil {
		fmt.Printf("EpisodeID: %d\n", *episodeID)
	} else {
		fmt.Println("EpisodeID: nil")
	}
	if animeID != nil {
		fmt.Printf("AnimeID: %d\n", *animeID)
	} else {
		fmt.Println("AnimeID: nil")
	}
	fmt.Printf("===========================\n\n")

	history := &domain.History{
		UserID:       userID,
		ActivityType: activityType,
		EpisodeID:    episodeID,
		AnimeID:      animeID,
		CommentID:    commentID,
		Image:        image,
	}
	return s.repo.CreateHistory(history)
}

func (s *HistoryService) TrackWithMetadata(userID uint, activityType domain.ActivityType, episodeID, animeID, commentID *uint, metadata string, image string) error {
	history := &domain.History{
		UserID:       userID,
		ActivityType: activityType,
		EpisodeID:    episodeID,
		AnimeID:      animeID,
		CommentID:    commentID,
		Image:        image,
		Metadata:     metadata,
	}
	return s.repo.CreateHistory(history)
}

func (s *HistoryService) GetHistory(userID uint, limit, offset int) ([]domain.History, error) {
	return s.repo.GetUserHistory(userID, limit, offset)
}

func (s *HistoryService) GetHistoryByType(userID uint, activityType domain.ActivityType, limit int) ([]domain.History, error) {
	return s.repo.GetUserHistoryByType(userID, activityType, limit)
}

func (s *HistoryService) ClearHistory(userID uint) error {
	return s.repo.DeleteUserHistory(userID)
}
