package repository

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"errors"

	"gorm.io/gorm"
)

// Ensure implementation
var _ port.PostRepository = &SQLiteRepository{}

// --- Post Repository ---

func (r *SQLiteRepository) CreatePost(post *domain.Post) error {
	return r.db.Create(post).Error
}

func (r *SQLiteRepository) GetPostByID(id uint) (*domain.Post, error) {
	var post domain.Post
	err := r.db.Preload("User").Preload("Media").First(&post, id).Error
	return &post, err
}

func (r *SQLiteRepository) DeletePost(id uint) error {
	return r.db.Delete(&domain.Post{}, id).Error
}

func (r *SQLiteRepository) UpdatePost(post *domain.Post, mediaToKeep []uint) error {
	tx := r.db.Begin()

	// 1. Delete media that are not in the 'keep' list
	if len(mediaToKeep) > 0 {
		if err := tx.Where("post_id = ? AND id NOT IN ?", post.ID, mediaToKeep).Delete(&domain.PostMedia{}).Error; err != nil {
			tx.Rollback()
			return err
		}
	} else {
		// If mediaToKeep is empty, it might mean we want to delete all existing ones (if we are adding new ones)
		// but usually if we are just updating text we keep them.
		// However, if we explicitly send an empty list and we have new media, we should wipe previous ones.
		if err := tx.Where("post_id = ?", post.ID).Delete(&domain.PostMedia{}).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	// 2. Save the post content (and associate new media if any are in post.Media)
	if err := tx.Save(post).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

func (r *SQLiteRepository) GetFeedPaginated(limit, offset int) ([]domain.Post, error) {
	var posts []domain.Post
	err := r.db.Preload("User").
		Preload("Media").
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&posts).Error
	return posts, err
}

func (r *SQLiteRepository) GetUserPostsPaginated(userID uint, limit, offset int) ([]domain.Post, error) {
	var posts []domain.Post
	err := r.db.Preload("User").
		Preload("Media").
		Where("user_id = ?", userID).
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&posts).Error
	return posts, err
}

// TogglePostLike toggles a like and returns the resulting state string ("added", "removed", "changed")
func (r *SQLiteRepository) TogglePostLike(userID, postID uint, reactionType string) (string, error) {
	var result string
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var like domain.PostLike
		err := tx.Where("user_id = ? AND post_id = ?", userID, postID).First(&like).Error
		newCol := reactionType + "s"

		if errors.Is(err, gorm.ErrRecordNotFound) {
			newLike := domain.PostLike{UserID: userID, PostID: postID, Type: reactionType}
			if err := tx.Create(&newLike).Error; err != nil {
				return err
			}
			result = "added"
			return tx.Model(&domain.Post{}).Where("id = ?", postID).UpdateColumn(newCol, gorm.Expr(newCol+" + 1")).Error
		} else if err != nil {
			return err
		}

		if like.Type == reactionType {
			if err := tx.Delete(&like).Error; err != nil {
				return err
			}
			result = "removed"
			return tx.Model(&domain.Post{}).Where("id = ?", postID).UpdateColumn(newCol, gorm.Expr(newCol+" - 1")).Error
		} else {
			oldCol := like.Type + "s"
			like.Type = reactionType
			if err := tx.Save(&like).Error; err != nil {
				return err
			}
			result = "changed"
			if err := tx.Model(&domain.Post{}).Where("id = ?", postID).
				UpdateColumn(oldCol, gorm.Expr(oldCol+" - 1")).
				UpdateColumn(newCol, gorm.Expr(newCol+" + 1")).Error; err != nil {
				return err
			}
		}
		return nil
	})
	return result, err
}

// --- Post Comment Repository ---

func (r *SQLiteRepository) CreateComment(comment *domain.PostComment) error {
	tx := r.db.Begin()
	if err := tx.Create(comment).Error; err != nil {
		tx.Rollback()
		return err
	}
	// Increment comment count on post
	if err := tx.Model(&domain.Post{}).Where("id = ?", comment.PostID).UpdateColumn("comments", gorm.Expr("comments + 1")).Error; err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}

func (r *SQLiteRepository) GetCommentByID(id uint) (*domain.PostComment, error) {
	var comment domain.PostComment
	err := r.db.Preload("User").Preload("Parent").Preload("Parent.User").First(&comment, id).Error
	return &comment, err
}

func (r *SQLiteRepository) UpdateComment(comment *domain.PostComment) error {
	return r.db.Save(comment).Error
}

func (r *SQLiteRepository) DeleteComment(id uint) error {
	var comment domain.PostComment
	if err := r.db.First(&comment, id).Error; err != nil {
		return err
	}

	tx := r.db.Begin()
	if err := tx.Delete(&domain.PostComment{}, id).Error; err != nil {
		tx.Rollback()
		return err
	}
	// Decrement comment count on post
	if err := tx.Model(&domain.Post{}).Where("id = ?", comment.PostID).UpdateColumn("comments", gorm.Expr("comments - 1")).Error; err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}

func (r *SQLiteRepository) GetCommentsByPostIDPaginated(postID uint, limit, offset int) ([]domain.PostComment, error) {
	var comments []domain.PostComment
	err := r.db.Preload("User").
		Preload("Children").
		Preload("Children.User").
		Where("post_id = ? AND (parent_id IS NULL OR parent_id = 0)", postID).
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&comments).Error
	return comments, err
}

func (r *SQLiteRepository) GetRepliesByCommentIDPaginated(parentID uint, limit, offset int) ([]domain.PostComment, error) {
	var comments []domain.PostComment
	err := r.db.Preload("User").
		Where("parent_id = ?", parentID).
		Order("created_at asc"). // Usually chronologically
		Limit(limit).
		Offset(offset).
		Find(&comments).Error
	return comments, err
}

func (r *SQLiteRepository) ToggleCommentLike(userID, commentID uint, reactionType string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var like domain.PostCommentLike
		err := tx.Where("user_id = ? AND comment_id = ?", userID, commentID).First(&like).Error
		newCol := reactionType + "s"

		if errors.Is(err, gorm.ErrRecordNotFound) {
			newLike := domain.PostCommentLike{UserID: userID, CommentID: commentID, Type: reactionType}
			if err := tx.Create(&newLike).Error; err != nil {
				return err
			}
			return tx.Model(&domain.PostComment{}).Where("id = ?", commentID).UpdateColumn(newCol, gorm.Expr(newCol+" + 1")).Error
		} else if err != nil {
			return err
		}

		if like.Type == reactionType {
			if err := tx.Delete(&like).Error; err != nil {
				return err
			}
			return tx.Model(&domain.PostComment{}).Where("id = ?", commentID).UpdateColumn(newCol, gorm.Expr(newCol+" - 1")).Error
		} else {
			oldCol := like.Type + "s"
			like.Type = reactionType
			if err := tx.Save(&like).Error; err != nil {
				return err
			}
			if err := tx.Model(&domain.PostComment{}).Where("id = ?", commentID).
				UpdateColumn(oldCol, gorm.Expr(oldCol+" - 1")).
				UpdateColumn(newCol, gorm.Expr(newCol+" + 1")).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *SQLiteRepository) GetPostLikeStatus(userID, postID uint, like *domain.PostLike) error {
	return r.db.Where("user_id = ? AND post_id = ?", userID, postID).First(like).Error
}

func (r *SQLiteRepository) GetPostReactions(postID uint) ([]domain.PostLike, error) {
	var likes []domain.PostLike
	err := r.db.Preload("User").Where("post_id = ?", postID).Find(&likes).Error
	return likes, err
}

func (r *SQLiteRepository) GetCommentReactions(commentID uint) ([]domain.PostCommentLike, error) {
	var likes []domain.PostCommentLike
	err := r.db.Preload("User").Where("comment_id = ?", commentID).Find(&likes).Error
	return likes, err
}

// GetPostCommentLikeStatus returns the current user's reaction type for a post comment, or "" if none.
func (r *SQLiteRepository) GetPostCommentLikeStatus(userID, commentID uint) string {
	var like domain.PostCommentLike
	err := r.db.Where("user_id = ? AND comment_id = ?", userID, commentID).First(&like).Error
	if err != nil {
		return ""
	}
	return like.Type
}

func (r *SQLiteRepository) GetMostRecentCommentByUserAndParent(userID, parentID uint) (*domain.PostComment, error) {
	var comment domain.PostComment
	err := r.db.Where("user_id = ? AND parent_id = ?", userID, parentID).Order("created_at desc").First(&comment).Error
	if err != nil {
		return nil, err
	}
	return &comment, nil
}
