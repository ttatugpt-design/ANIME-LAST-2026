package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"errors"
)

type postService struct {
	repo port.PostRepository
}

func NewPostService(repo port.PostRepository) port.PostService {
	return &postService{repo: repo}
}

func (s *postService) CreatePost(userID uint, content string, imageUrls []string) (*domain.Post, error) {
	if content == "" && len(imageUrls) == 0 {
		return nil, errors.New("post must contain content or images")
	}

	post := &domain.Post{
		UserID:  userID,
		Content: content,
	}

	for _, url := range imageUrls {
		post.Images = append(post.Images, domain.PostImage{ImageURL: url})
	}

	if err := s.repo.CreatePost(post); err != nil {
		return nil, err
	}

	// Fetch it back to get preloaded user data if needed, or return as is.
	return s.GetPostByID(post.ID)
}

func (s *postService) GetPostByID(id uint) (*domain.Post, error) {
	return s.repo.GetPostByID(id)
}

func (s *postService) DeletePost(userID, postID uint) error {
	post, err := s.repo.GetPostByID(postID)
	if err != nil {
		return err
	}
	if post.UserID != userID {
		return errors.New("unauthorized to delete this post")
	}
	return s.repo.DeletePost(postID)
}

func (s *postService) GetFeedPaginated(limit, offset int) ([]domain.Post, error) {
	return s.repo.GetFeedPaginated(limit, offset)
}

func (s *postService) GetUserPostsPaginated(userID uint, limit, offset int) ([]domain.Post, error) {
	return s.repo.GetUserPostsPaginated(userID, limit, offset)
}

func (s *postService) TogglePostLike(userID, postID uint) (bool, error) {
	return s.repo.TogglePostLike(userID, postID)
}

func (s *postService) CreateComment(userID, postID uint, parentID *uint, content string) (*domain.PostComment, error) {
	if content == "" {
		return nil, errors.New("comment content cannot be empty")
	}

	comment := &domain.PostComment{
		UserID:  userID,
		PostID:  postID,
		Content: content,
	}
	if parentID != nil && *parentID > 0 {
		comment.ParentID = parentID
	}

	if err := s.repo.CreateComment(comment); err != nil {
		return nil, err
	}

	return s.repo.GetCommentByID(comment.ID)
}

func (s *postService) DeleteComment(userID, commentID uint) error {
	comment, err := s.repo.GetCommentByID(commentID)
	if err != nil {
		return err
	}
	if comment.UserID != userID {
		return errors.New("unauthorized to delete this comment")
	}
	return s.repo.DeleteComment(commentID)
}

func (s *postService) GetCommentsByPostIDPaginated(postID uint, limit, offset int) ([]domain.PostComment, error) {
	return s.repo.GetCommentsByPostIDPaginated(postID, limit, offset)
}

func (s *postService) GetRepliesByCommentIDPaginated(parentID uint, limit, offset int) ([]domain.PostComment, error) {
	return s.repo.GetRepliesByCommentIDPaginated(parentID, limit, offset)
}

func (s *postService) ToggleCommentLike(userID, commentID uint, isLike bool) error {
	return s.repo.ToggleCommentLike(userID, commentID, isLike)
}

func (s *postService) GetPostLikeStatus(userID, postID uint, like *domain.PostLike) error {
	return s.repo.GetPostLikeStatus(userID, postID, like)
}
