package repository

import (
	"backend/internal/core/domain"
	"fmt"

	"gorm.io/gorm"
)

type EpisodeLikeRepository struct {
	db *gorm.DB
}

func NewEpisodeLikeRepository(db *gorm.DB) *EpisodeLikeRepository {
	return &EpisodeLikeRepository{db: db}
}

// ToggleLike toggles the user's reaction for an episode
// If switching reaction types, it updates both counts
// If clicking the same reaction twice, it removes the reaction
func (r *EpisodeLikeRepository) ToggleLike(userID, episodeID uint, reactionType string) error {
	var existing domain.EpisodeLike
	err := r.db.Where("user_id = ? AND episode_id = ?", userID, episodeID).First(&existing).Error

	return r.db.Transaction(func(tx *gorm.DB) error {
		// Helper to get column name for a reaction type
		getColumnName := func(rtype string) string {
			switch rtype {
			case "like":
				return "likes_count"
			case "love":
				return "loves_count"
			case "haha":
				return "hahas_count"
			case "wow":
				return "wows_count"
			case "sad":
				return "sads_count"
			case "angry":
				return "angrys_count"
			case "super_sad":
				return "super_sads_count"
			case "dislike":
				return "dislikes_count"
			default:
				return "likes_count"
			}
		}

		if err == gorm.ErrRecordNotFound {
			// No existing reaction - create new one
			if err := tx.Create(&domain.EpisodeLike{
				UserID:    userID,
				EpisodeID: episodeID,
				Type:      reactionType,
			}).Error; err != nil {
				return err
			}

			// Increment counter
			column := getColumnName(reactionType)
			return tx.Model(&domain.Episode{}).Where("id = ?", episodeID).
				UpdateColumn(column, gorm.Expr(column+" + 1")).Error
		}

		// Existing reaction found
		if existing.Type == reactionType {
			// Clicking same button - remove reaction
			if err := tx.Delete(&existing).Error; err != nil {
				return err
			}

			// Decrement counter
			column := getColumnName(reactionType)
			return tx.Model(&domain.Episode{}).Where("id = ?", episodeID).
				UpdateColumn(column, gorm.Expr(fmt.Sprintf("CASE WHEN %s > 0 THEN %s - 1 ELSE 0 END", column, column))).Error
		}

		// Switching reaction types
		oldType := existing.Type
		existing.Type = reactionType
		if err := tx.Save(&existing).Error; err != nil {
			return err
		}

		// Update both counters
		oldColumn := getColumnName(oldType)
		newColumn := getColumnName(reactionType)

		if err := tx.Model(&domain.Episode{}).Where("id = ?", episodeID).
			UpdateColumn(oldColumn, gorm.Expr(fmt.Sprintf("CASE WHEN %s > 0 THEN %s - 1 ELSE 0 END", oldColumn, oldColumn))).Error; err != nil {
			return err
		}

		return tx.Model(&domain.Episode{}).Where("id = ?", episodeID).
			UpdateColumn(newColumn, gorm.Expr(newColumn+" + 1")).Error
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
