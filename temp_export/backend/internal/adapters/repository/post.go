package repository

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"

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
	err := r.db.Preload("User").Preload("Images").First(&post, id).Error
	return &post, err
}

func (r *SQLiteRepository) DeletePost(id uint) error {
	return r.db.Delete(&domain.Post{}, id).Error
}

func (r *SQLiteRepository) GetFeedPaginated(limit, offset int) ([]domain.Post, error) {
	var posts []domain.Post
	err := r.db.Preload("User").
		Preload("Images").
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&posts).Error
	return posts, err
}

func (r *SQLiteRepository) GetUserPostsPaginated(userID uint, limit, offset int) ([]domain.Post, error) {
	var posts []domain.Post
	err := r.db.Preload("User").
		Preload("Images").
		Where("user_id = ?", userID).
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&posts).Error
	return posts, err
}

// TogglePostLike toggles a like. Returns true if liked, false if unliked.
func (r *SQLiteRepository) TogglePostLike(userID, postID uint) (bool, error) {
	var like domain.PostLike
	// Check if like exists
	err := r.db.Where("user_id = ? AND post_id = ?", userID, postID).First(&like).Error

	if err == nil {
		// Like exists, remove it and decrement count
		tx := r.db.Begin()
		if err := tx.Delete(&like).Error; err != nil {
			tx.Rollback()
			return false, err
		}
		if err := tx.Model(&domain.Post{}).Where("id = ?", postID).UpdateColumn("likes", gorm.Expr("likes - 1")).Error; err != nil {
			tx.Rollback()
			return false, err
		}
		tx.Commit()
		return false, nil
	}

	// Like doesn't exist, create it and increment count
	like = domain.PostLike{UserID: userID, PostID: postID, IsLike: true}
	tx := r.db.Begin()
	if err := tx.Create(&like).Error; err != nil {
		tx.Rollback()
		return false, err
	}
	if err := tx.Model(&domain.Post{}).Where("id = ?", postID).UpdateColumn("likes", gorm.Expr("likes + 1")).Error; err != nil {
		tx.Rollback()
		return false, err
	}
	tx.Commit()
	return true, nil
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
	err := r.db.Preload("User").First(&comment, id).Error
	return &comment, err
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

func (r *SQLiteRepository) ToggleCommentLike(userID, commentID uint, isLike bool) error {
	// Reusing logic similar to standard comments
	var like domain.PostCommentLike
	err := r.db.Where("user_id = ? AND comment_id = ?", userID, commentID).First(&like).Error

	tx := r.db.Begin()

	if err == nil {
		// Like/Dislike exists
		if like.IsLike == isLike {
			// Remove it entirely if clicking the same button
			if err := tx.Delete(&like).Error; err != nil {
				tx.Rollback()
				return err
			}
			column := "likes"
			if !isLike {
				column = "dislikes"
			}
			if err := tx.Model(&domain.PostComment{}).Where("id = ?", commentID).UpdateColumn(column, gorm.Expr(column+" - 1")).Error; err != nil {
				tx.Rollback()
				return err
			}
		} else {
			// Toggle from like to dislike or vice versa
			like.IsLike = isLike
			if err := tx.Save(&like).Error; err != nil {
				tx.Rollback()
				return err
			}
			// Update counts
			if isLike {
				// Changed from dislike to like
				if err := tx.Model(&domain.PostComment{}).Where("id = ?", commentID).UpdateColumn("likes", gorm.Expr("likes + 1")).Error; err != nil {
					tx.Rollback()
					return err
				}
				if err := tx.Model(&domain.PostComment{}).Where("id = ?", commentID).UpdateColumn("dislikes", gorm.Expr("dislikes - 1")).Error; err != nil {
					tx.Rollback()
					return err
				}
			} else {
				// Changed from like to dislike
				if err := tx.Model(&domain.PostComment{}).Where("id = ?", commentID).UpdateColumn("likes", gorm.Expr("likes - 1")).Error; err != nil {
					tx.Rollback()
					return err
				}
				if err := tx.Model(&domain.PostComment{}).Where("id = ?", commentID).UpdateColumn("dislikes", gorm.Expr("dislikes + 1")).Error; err != nil {
					tx.Rollback()
					return err
				}
			}
		}
	} else {
		// New like/dislike
		like = domain.PostCommentLike{UserID: userID, CommentID: commentID, IsLike: isLike}
		if err := tx.Create(&like).Error; err != nil {
			tx.Rollback()
			return err
		}
		column := "likes"
		if !isLike {
			column = "dislikes"
		}
		if err := tx.Model(&domain.PostComment{}).Where("id = ?", commentID).UpdateColumn(column, gorm.Expr(column+" + 1")).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit().Error
}

func (r *SQLiteRepository) GetPostLikeStatus(userID, postID uint, like *domain.PostLike) error {
	return r.db.Where("user_id = ? AND post_id = ?", userID, postID).First(like).Error
}
