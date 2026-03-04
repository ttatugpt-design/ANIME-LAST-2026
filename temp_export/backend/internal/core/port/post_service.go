package port

import "backend/internal/core/domain"

type PostService interface {
	CreatePost(userID uint, content string, imageUrls []string) (*domain.Post, error)
	GetPostByID(id uint) (*domain.Post, error)
	DeletePost(userID, postID uint) error

	GetFeedPaginated(limit, offset int) ([]domain.Post, error)
	GetUserPostsPaginated(userID uint, limit, offset int) ([]domain.Post, error)

	TogglePostLike(userID, postID uint) (bool, error)

	CreateComment(userID, postID uint, parentID *uint, content string) (*domain.PostComment, error)
	DeleteComment(userID, commentID uint) error
	GetCommentsByPostIDPaginated(postID uint, limit, offset int) ([]domain.PostComment, error)
	GetRepliesByCommentIDPaginated(parentID uint, limit, offset int) ([]domain.PostComment, error)
	ToggleCommentLike(userID, commentID uint, isLike bool) error

	GetPostLikeStatus(userID, postID uint, like *domain.PostLike) error
}
