package repository

import (
	"backend/internal/core/domain"
)

// Implement WatchLaterRepository interface on SQLiteRepository

func (r *SQLiteRepository) AddToWatchLater(entry *domain.WatchLater) error {
	return r.db.Create(entry).Error
}

func (r *SQLiteRepository) RemoveFromWatchLater(userID uint, animeID *uint, episodeID *uint) error {
	query := r.db.Where("user_id = ?", userID)
	if animeID != nil {
		query = query.Where("anime_id = ?", *animeID)
	}
	if episodeID != nil {
		query = query.Where("episode_id = ?", *episodeID)
	}
	return query.Delete(&domain.WatchLater{}).Error
}

func (r *SQLiteRepository) GetWatchLaterByUser(userID uint) ([]domain.WatchLater, error) {
	var entries []domain.WatchLater
	// Preload Anime and Episode details
	err := r.db.Where("user_id = ?", userID).
		Preload("Anime").
		Preload("Episode").
		Preload("Episode.Anime"). // Preload Anime for Episode context if needed
		Order("created_at desc").
		Find(&entries).Error
	return entries, err
}

func (r *SQLiteRepository) IsWatchLater(userID uint, animeID *uint, episodeID *uint) (bool, error) {
	var count int64
	query := r.db.Model(&domain.WatchLater{}).Where("user_id = ?", userID)
	if animeID != nil {
		query = query.Where("anime_id = ?", *animeID)
	}
	if episodeID != nil {
		query = query.Where("episode_id = ?", *episodeID)
	}
	err := query.Count(&count).Error
	return count > 0, err
}
func (r *SQLiteRepository) CountWatchLater(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&domain.WatchLater{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}
