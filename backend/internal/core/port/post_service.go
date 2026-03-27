package port

import "backend/internal/core/domain"

type PostService interface {
	CreatePost(userID uint, content string, media []domain.PostMedia) (*domain.Post, error)
	GetPostByID(id uint) (*domain.Post, error)
	UpdatePost(userID, postID uint, content string, mediaToKeep []uint, newMedia []domain.PostMedia) (*domain.Post, error)
	DeletePost(userID, postID uint) error

	GetFeedPaginated(limit, offset int) ([]domain.Post, error)
	GetUserPostsPaginated(userID uint, limit, offset int) ([]domain.Post, error)

	TogglePostLike(userID, postID uint, reactionType string) (string, error)

	CreateComment(userID, postID uint, parentID, mentionUserID *uint, content string) (*domain.PostComment, error)
	GetCommentByID(id uint) (*domain.PostComment, error)
	UpdateComment(userID, commentID uint, content string) (*domain.PostComment, error)
	DeleteComment(userID, commentID uint) error
	GetCommentsByPostIDPaginated(postID uint, limit, offset int) ([]domain.PostComment, error)
	GetRepliesByCommentIDPaginated(parentID uint, limit, offset int) ([]domain.PostComment, error)
	ToggleCommentLike(userID, commentID uint, reactionType string) error

	GetPostLikeStatus(userID, postID uint, like *domain.PostLike) error
	GetMostRecentCommentByUserAndParent(userID, parentID uint) (*domain.PostComment, error)

	GetPostReactions(postID uint) ([]domain.PostLike, error)
	GetCommentReactions(commentID uint) ([]domain.PostCommentLike, error)
	GetPostCommentLikeStatus(userID, commentID uint) string
}
