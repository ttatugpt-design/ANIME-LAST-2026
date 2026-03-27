package port

import "backend/internal/core/domain"

type PostRepository interface {
	// Post operations
	CreatePost(post *domain.Post) error
	GetPostByID(id uint) (*domain.Post, error)
	UpdatePost(post *domain.Post, mediaToKeep []uint) error
	DeletePost(id uint) error

	// Feed and Lists
	GetFeedPaginated(limit, offset int) ([]domain.Post, error)
	GetUserPostsPaginated(userID uint, limit, offset int) ([]domain.Post, error)

	// Post Interactions
	TogglePostLike(userID, postID uint, reactionType string) (string, error)

	// Comment operations
	CreateComment(comment *domain.PostComment) error
	GetCommentByID(id uint) (*domain.PostComment, error)
	UpdateComment(comment *domain.PostComment) error
	DeleteComment(id uint) error

	// Comment Lists
	GetCommentsByPostIDPaginated(postID uint, limit, offset int) ([]domain.PostComment, error)
	GetRepliesByCommentIDPaginated(parentID uint, limit, offset int) ([]domain.PostComment, error)

	// Comment Interactions
	ToggleCommentLike(userID, commentID uint, reactionType string) error

	GetPostLikeStatus(userID, postID uint, like *domain.PostLike) error
	GetMostRecentCommentByUserAndParent(userID, parentID uint) (*domain.PostComment, error)

	// Tooltip Fetches
	GetPostReactions(postID uint) ([]domain.PostLike, error)
	GetCommentReactions(commentID uint) ([]domain.PostCommentLike, error)
	GetPostCommentLikeStatus(userID, commentID uint) string
}
