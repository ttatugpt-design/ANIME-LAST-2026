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
	if err := r.db.Preload("User").Preload("Parent").Preload("Parent.User").Preload("Episode").Preload("Episode.Anime").Preload("Chapter").Preload("Chapter.Anime").First(&comment, id).Error; err != nil {
		return nil, err
	}
	return &comment, nil
}

func (r *CommentRepository) GetByEpisodeID(episodeID uint) ([]domain.Comment, error) {
	var allComments []domain.Comment
	err := r.db.Preload("User").
		Where("episode_id = ?", episodeID).
		Order("created_at asc").
		Find(&allComments).Error
	if err != nil {
		return nil, err
	}

	commentMap := make(map[uint]*domain.Comment)
	for i := range allComments {
		commentMap[allComments[i].ID] = &allComments[i]
	}

	for i := range allComments {
		comment := &allComments[i]
		if comment.ParentID != nil && *comment.ParentID != 0 {
			if parent, exists := commentMap[*comment.ParentID]; exists {
				parent.Children = append(parent.Children, *comment)
			}
		}
	}

	var finalRoots []domain.Comment
	for i := len(allComments) - 1; i >= 0; i-- {
		c := &allComments[i]
		if c.ParentID == nil || *c.ParentID == 0 {
			finalRoots = append(finalRoots, *commentMap[c.ID])
		}
	}

	return finalRoots, nil
}

// GetByEpisodeIDPaginated returns paginated top-level comments with all their children.
func (r *CommentRepository) GetByEpisodeIDPaginated(episodeID uint, page, limit int) ([]domain.Comment, int64, error) {
	if page <= 0 { page = 1 }
	if limit <= 0 { limit = 10 }
	offset := (page - 1) * limit

	// Count total top-level comments
	var total int64
	r.db.Model(&domain.Comment{}).Where("episode_id = ? AND (parent_id IS NULL OR parent_id = 0)", episodeID).Count(&total)

	// Fetch paginated top-level root comments
	var roots []domain.Comment
	err := r.db.Preload("User").
		Where("episode_id = ? AND (parent_id IS NULL OR parent_id = 0)", episodeID).
		Order("created_at desc").
		Limit(limit).Offset(offset).
		Find(&roots).Error
	if err != nil {
		return nil, 0, err
	}
	if len(roots) == 0 {
		return roots, total, nil
	}

	// Collect root IDs to fetch their children
	rootIDs := make([]uint, len(roots))
	for i, r := range roots { rootIDs[i] = r.ID }

	var children []domain.Comment
	r.db.Preload("User").
		Where("episode_id = ? AND parent_id IN ?", episodeID, rootIDs).
		Order("created_at asc").
		Find(&children)

	// Attach children to their parents
	rootMap := make(map[uint]*domain.Comment, len(roots))
	for i := range roots { rootMap[roots[i].ID] = &roots[i] }
	for _, child := range children {
		if child.ParentID != nil {
			parentID := *child.ParentID
			if parent, ok := rootMap[parentID]; ok {
				parent.Children = append(parent.Children, child)
			} else {
				// reply-to-reply: walk up once
				for _, rc := range roots {
					if rc.Children != nil {
						for _, rc2 := range rc.Children {
							if rc2.ID == parentID {
								if rr, ok2 := rootMap[rc.ID]; ok2 {
									rr.Children = append(rr.Children, child)
								}
							}
						}
					}
				}
			}
		}
	}

	return roots, total, nil
}

func (r *CommentRepository) GetByChapterID(chapterID uint) ([]domain.Comment, error) {
	var allComments []domain.Comment
	err := r.db.Preload("User").
		Where("chapter_id = ?", chapterID).
		Order("created_at asc").
		Find(&allComments).Error
	if err != nil {
		return nil, err
	}

	commentMap := make(map[uint]*domain.Comment)
	for i := range allComments {
		commentMap[allComments[i].ID] = &allComments[i]
	}

	for i := range allComments {
		comment := &allComments[i]
		if comment.ParentID != nil && *comment.ParentID != 0 {
			if parent, exists := commentMap[*comment.ParentID]; exists {
				parent.Children = append(parent.Children, *comment)
			}
		}
	}

	var finalRoots []domain.Comment
	for i := len(allComments) - 1; i >= 0; i-- {
		c := &allComments[i]
		if c.ParentID == nil || *c.ParentID == 0 {
			finalRoots = append(finalRoots, *commentMap[c.ID])
		}
	}

	return finalRoots, nil
}

// GetByChapterIDPaginated returns paginated top-level comments with their children.
func (r *CommentRepository) GetByChapterIDPaginated(chapterID uint, page, limit int) ([]domain.Comment, int64, error) {
	if page <= 0 { page = 1 }
	if limit <= 0 { limit = 10 }
	offset := (page - 1) * limit

	var total int64
	r.db.Model(&domain.Comment{}).Where("chapter_id = ? AND (parent_id IS NULL OR parent_id = 0)", chapterID).Count(&total)

	var roots []domain.Comment
	err := r.db.Preload("User").
		Where("chapter_id = ? AND (parent_id IS NULL OR parent_id = 0)", chapterID).
		Order("created_at desc").
		Limit(limit).Offset(offset).
		Find(&roots).Error
	if err != nil {
		return nil, 0, err
	}
	if len(roots) == 0 {
		return roots, total, nil
	}

	rootIDs := make([]uint, len(roots))
	for i, r := range roots { rootIDs[i] = r.ID }

	var children []domain.Comment
	r.db.Preload("User").
		Where("chapter_id = ? AND parent_id IN ?", chapterID, rootIDs).
		Order("created_at asc").
		Find(&children)

	rootMap := make(map[uint]*domain.Comment, len(roots))
	for i := range roots { rootMap[roots[i].ID] = &roots[i] }
	for _, child := range children {
		if child.ParentID != nil {
			if parent, ok := rootMap[*child.ParentID]; ok {
				parent.Children = append(parent.Children, child)
			}
		}
	}

	return roots, total, nil
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

// ToggleLike handles like/dislike logic for comments via 7 reaction types
func (r *CommentRepository) ToggleLike(userID, commentID uint, reactionType string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var like domain.CommentLike
		err := tx.Where("user_id = ? AND comment_id = ?", userID, commentID).First(&like).Error

		// Safely construct column name based on reaction type (append 's')
		newCol := reactionType + "s"

		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new interaction
			newLike := domain.CommentLike{UserID: userID, CommentID: commentID, Type: reactionType}
			if err := tx.Create(&newLike).Error; err != nil {
				return err
			}
			// Update counts
			return tx.Model(&domain.Comment{}).Where("id = ?", commentID).UpdateColumn(newCol, gorm.Expr(newCol+"+ ?", 1)).Error
		} else if err != nil {
			return err
		}

		// Interaction exists
		if like.Type == reactionType {
			// User clicked same button -> Remove interaction (Toggle off)
			if err := tx.Delete(&like).Error; err != nil {
				return err
			}
			return tx.Model(&domain.Comment{}).Where("id = ?", commentID).UpdateColumn(newCol, gorm.Expr(newCol+"- ?", 1)).Error
		} else {
			// User changed from one reaction to another
			oldCol := like.Type + "s"
			like.Type = reactionType
			if err := tx.Save(&like).Error; err != nil {
				return err
			}
			// Adjust counts: -1 from old, +1 to new
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

// GetMostRecentByUserAndParent finds the most recent reply by a user under a specific parent
func (r *CommentRepository) GetMostRecentByUserAndParent(userID, parentID uint) (*domain.Comment, error) {
	var comment domain.Comment
	err := r.db.Where("user_id = ? AND parent_id = ?", userID, parentID).Order("created_at desc").First(&comment).Error
	if err != nil {
		return nil, err
	}
	return &comment, nil
}

// GetReactions fetches all reactions for a specific comment, preloading user data
func (r *CommentRepository) GetReactions(commentID uint) ([]domain.CommentLike, error) {
	var likes []domain.CommentLike
	err := r.db.Preload("User").Where("comment_id = ?", commentID).Find(&likes).Error
	return likes, err
}

// GetCommentLikeStatus returns the user's current reaction type for a comment, or empty string if none.
func (r *CommentRepository) GetCommentLikeStatus(userID, commentID uint) string {
	var like domain.CommentLike
	err := r.db.Where("user_id = ? AND comment_id = ?", userID, commentID).First(&like).Error
	if err != nil {
		return ""
	}
	return like.Type
}
