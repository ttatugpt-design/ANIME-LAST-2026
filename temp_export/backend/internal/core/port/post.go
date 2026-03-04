package port

import "backend/internal/core/domain"

type PostRepository interface {
	// Post operations
	CreatePost(post *domain.Post) error
	GetPostByID(id uint) (*domain.Post, error)
	DeletePost(id uint) error

	// Feed and Lists
	GetFeedPaginated(limit, offset int) ([]domain.Post, error)
	GetUserPostsPaginated(userID uint, limit, offset int) ([]domain.Post, error)

	// Post Interactions
	TogglePostLike(userID, postID uint) (bool, error) // Returns true if liked, false if unliked

	// Comment operations
	CreateComment(comment *domain.PostComment) error
	GetCommentByID(id uint) (*domain.PostComment, error)
	DeleteComment(id uint) error

	// Comment Lists
	GetCommentsByPostIDPaginated(postID uint, limit, offset int) ([]domain.PostComment, error)
	GetRepliesByCommentIDPaginated(parentID uint, limit, offset int) ([]domain.PostComment, error)

	// Comment Interactions
	ToggleCommentLike(userID, commentID uint, isLike bool) error

	GetPostLikeStatus(userID, postID uint, like *domain.PostLike) error
}
