package repository

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

type EpisodeLikeRepository struct {
	db *gorm.DB
}

func NewEpisodeLikeRepository(db *gorm.DB) *EpisodeLikeRepository {
	return &EpisodeLikeRepository{db: db}
}

// ToggleLike toggles the user's like/dislike for an episode
// If switching from like to dislike or vice versa, it updates both counts
// If clicking the same reaction twice, it removes the reaction
func (r *EpisodeLikeRepository) ToggleLike(userID, episodeID uint, isLike bool) error {
	var existing domain.EpisodeLike
	err := r.db.Where("user_id = ? AND episode_id = ?", userID, episodeID).First(&existing).Error

	return r.db.Transaction(func(tx *gorm.DB) error {
		if err == gorm.ErrRecordNotFound {
			// No existing reaction - create new one
			if err := tx.Create(&domain.EpisodeLike{
				UserID:    userID,
				EpisodeID: episodeID,
				IsLike:    isLike,
			}).Error; err != nil {
				return err
			}

			// Increment appropriate counter
			if isLike {
				return tx.Model(&domain.Episode{}).Where("id = ?", episodeID).
					UpdateColumn("likes_count", gorm.Expr("likes_count + 1")).Error
			} else {
				return tx.Model(&domain.Episode{}).Where("id = ?", episodeID).
					UpdateColumn("dislikes_count", gorm.Expr("dislikes_count + 1")).Error
			}
		}

		// Existing reaction found
		if existing.IsLike == isLike {
			// Clicking same button - remove reaction
			if err := tx.Delete(&existing).Error; err != nil {
				return err
			}

			// Decrement appropriate counter
			if isLike {
				return tx.Model(&domain.Episode{}).Where("id = ?", episodeID).
					UpdateColumn("likes_count", gorm.Expr("CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END")).Error
			} else {
				return tx.Model(&domain.Episode{}).Where("id = ?", episodeID).
					UpdateColumn("dislikes_count", gorm.Expr("CASE WHEN dislikes_count > 0 THEN dislikes_count - 1 ELSE 0 END")).Error
			}
		}

		// Switching from like to dislike or vice versa
		existing.IsLike = isLike
		if err := tx.Save(&existing).Error; err != nil {
			return err
		}

		// Update both counters
		if isLike {
			// Switching to like: increment likes, decrement dislikes
			if err := tx.Model(&domain.Episode{}).Where("id = ?", episodeID).
				UpdateColumn("likes_count", gorm.Expr("likes_count + 1")).Error; err != nil {
				return err
			}
			return tx.Model(&domain.Episode{}).Where("id = ?", episodeID).
				UpdateColumn("dislikes_count", gorm.Expr("CASE WHEN dislikes_count > 0 THEN dislikes_count - 1 ELSE 0 END")).Error
		} else {
			// Switching to dislike: increment dislikes, decrement likes
			if err := tx.Model(&domain.Episode{}).Where("id = ?", episodeID).
				UpdateColumn("dislikes_count", gorm.Expr("dislikes_count + 1")).Error; err != nil {
				return err
			}
			return tx.Model(&domain.Episode{}).Where("id = ?", episodeID).
				UpdateColumn("likes_count", gorm.Expr("CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END")).Error
		}
	})
}

// GetUserReaction gets the user's current like/dislike for an episode
func (r *EpisodeLikeRepository) GetUserReaction(userID, episodeID uint) (*domain.EpisodeLike, error) {
	var like domain.EpisodeLike
	err := r.db.Where("user_id = ? AND episode_id = ?", userID, episodeID).First(&like).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &like, err
}
