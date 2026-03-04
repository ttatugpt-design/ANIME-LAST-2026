package repository

import (
	"backend/internal/core/domain"
	"time"
)

func (r *SQLiteRepository) CreateHistory(history *domain.History) error {
	return r.db.Create(history).Error
}

func (r *SQLiteRepository) GetUserHistory(userID uint, limit int, offset int) ([]domain.History, error) {
	var histories []domain.History
	err := r.db.
		Preload("Episode.Anime").
		Preload("Anime").
		Preload("Comment.User").
		Preload("Comment.Parent.User").
		Preload("Comment.Episode.Anime").
		Where("user_id = ?", userID).
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&histories).Error
	return histories, err
}

func (r *SQLiteRepository) GetUserHistoryByType(userID uint, activityType domain.ActivityType, limit int) ([]domain.History, error) {
	var histories []domain.History
	err := r.db.
		Preload("Episode.Anime").
		Preload("Anime").
		Preload("Comment.User").
		Preload("Comment.Parent.User").
		Preload("Comment.Episode.Anime").
		Where("user_id = ? AND activity_type = ?", userID, activityType).
		Order("created_at desc").
		Limit(limit).
		Find(&histories).Error
	return histories, err
}

func (r *SQLiteRepository) DeleteUserHistory(userID uint) error {
	return r.db.Where("user_id = ?", userID).Delete(&domain.History{}).Error
}

func (r *SQLiteRepository) DeleteOldHistory(days int) error {
	cutoffDate := time.Now().AddDate(0, 0, -days)
	return r.db.Where("created_at < ?", cutoffDate).Delete(&domain.History{}).Error
}
func (r *SQLiteRepository) CountHistory(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&domain.History{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}
