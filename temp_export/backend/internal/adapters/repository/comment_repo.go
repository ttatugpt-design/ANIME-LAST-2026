package repository

import (
	"backend/internal/core/domain"
	"errors"

	"gorm.io/gorm"
)

type CommentRepository struct {
	db *gorm.DB
}

func NewCommentRepository(db *gorm.DB) *CommentRepository {
	return &CommentRepository{db: db}
}

// Create adds a new comment
func (r *CommentRepository) Create(comment *domain.Comment) error {
	return r.db.Create(comment).Error
}

// GetByID fetches a comment by ID
func (r *CommentRepository) GetByID(id uint) (*domain.Comment, error) {
	var comment domain.Comment
	if err := r.db.Joins("User").Preload("Episode").Preload("Episode.Anime").First(&comment, id).Error; err != nil {
		return nil, err
	}
	return &comment, nil
}

func (r *CommentRepository) GetByEpisodeID(episodeID uint) ([]domain.Comment, error) {
	var allComments []domain.Comment
	// Fetch all comments for this episode at once to build tree in memory
	err := r.db.Preload("User").
		Where("episode_id = ?", episodeID).
		Order("created_at desc").
		Find(&allComments).Error
	if err != nil {
		return nil, err
	}

	// Build a map for O(1) lookups by ID
	commentMap := make(map[uint]*domain.Comment)
	for i := range allComments {
		commentMap[allComments[i].ID] = &allComments[i]
	}

	var rootComments []domain.Comment
	for i := range allComments {
		comment := &allComments[i]
		if comment.ParentID == nil || *comment.ParentID == 0 {
			// Top-level comment
			rootComments = append(rootComments, *comment)
		} else {
			// Nested reply
			if parent, exists := commentMap[*comment.ParentID]; exists {
				parent.Children = append(parent.Children, *comment)
			}
		}
	}

	// Note: rootComments contains copies. To ensure Children are correctly linked,
	// we should either use pointers everywhere or re-assign from map.
	// Let's refine rootComments to use the updated map entries.
	var finalRoots []domain.Comment
	for i := range allComments {
		c := &allComments[i]
		if c.ParentID == nil || *c.ParentID == 0 {
			finalRoots = append(finalRoots, *commentMap[c.ID])
		}
	}

	return finalRoots, nil
}

// GetAllComments fetches all comments for dashboard
func (r *CommentRepository) GetAllComments(limit int) ([]domain.Comment, error) {
	var comments []domain.Comment
	query := r.db.Preload("User").
		Preload("Episode").
		Preload("Episode.Anime"). // To show Anime name if needed
		Preload("Parent").
		Preload("Parent.User")

	if limit > 0 {
		query = query.Limit(limit).Order("created_at desc")
	} else {
		query = query.Order("created_at desc")
	}

	err := query.Find(&comments).Error
	return comments, err
}

// Update modifies comment content
func (r *CommentRepository) Update(comment *domain.Comment) error {
	return r.db.Save(comment).Error
}

// Delete removes a comment
func (r *CommentRepository) Delete(id uint) error {
	return r.db.Delete(&domain.Comment{}, id).Error
}

// ToggleLike handles like/dislike logic
func (r *CommentRepository) ToggleLike(userID, commentID uint, isLike bool) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var like domain.CommentLike
		err := tx.Where("user_id = ? AND comment_id = ?", userID, commentID).First(&like).Error

		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new interaction
			newLike := domain.CommentLike{UserID: userID, CommentID: commentID, IsLike: isLike}
			if err := tx.Create(&newLike).Error; err != nil {
				return err
			}
			// Update counts
			col := "likes"
			if !isLike {
				col = "dislikes"
			}
			return tx.Model(&domain.Comment{}).Where("id = ?", commentID).UpdateColumn(col, gorm.Expr(col+"+ ?", 1)).Error
		} else if err != nil {
			return err
		}

		// Interaction exists
		if like.IsLike == isLike {
			// User clicked same button -> Remove interaction (Toggle off)
			if err := tx.Delete(&like).Error; err != nil {
				return err
			}
			col := "likes"
			if !isLike {
				col = "dislikes"
			}
			return tx.Model(&domain.Comment{}).Where("id = ?", commentID).UpdateColumn(col, gorm.Expr(col+"- ?", 1)).Error
		} else {
			// User changed from Like to Dislike or vice versa
			like.IsLike = isLike
			if err := tx.Save(&like).Error; err != nil {
				return err
			}
			// Adjust counts: -1 from old, +1 to new
			oldCol := "dislikes"
			newCol := "likes"
			if !isLike {
				oldCol = "likes"
				newCol = "dislikes"
			}
			if err := tx.Model(&domain.Comment{}).Where("id = ?", commentID).
				Update(oldCol, gorm.Expr(oldCol+"- ?", 1)).
				Update(newCol, gorm.Expr(newCol+"+ ?", 1)).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// CountByEpisodeID returns the total number of comments for an episode
func (r *CommentRepository) CountByEpisodeID(episodeID uint) (int64, error) {
	var count int64
	err := r.db.Model(&domain.Comment{}).Where("episode_id = ?", episodeID).Count(&count).Error
	return count, err
}
