package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"time"
)

type AnimeService struct {
	repo port.AnimeRepository
}

func NewAnimeService(repo port.AnimeRepository) *AnimeService {
	return &AnimeService{repo: repo}
}

func (s *AnimeService) Create(anime *domain.Anime) (*domain.Anime, error) {
	if anime.Status == "" {
		anime.Status = "Ongoing"
	}
	if anime.Seasons == 0 {
		anime.Seasons = 1
	}
	anime.IsPublished = true
	anime.CreatedAt = time.Now()
	anime.UpdatedAt = time.Now()

	if err := s.repo.CreateAnime(anime); err != nil {
		return nil, err
	}
	return anime, nil
}

func (s *AnimeService) GetAll(categoryID uint, letter string, search string, animeType string, order string, limit int, offset int) ([]domain.Anime, error) {
	return s.repo.GetAllAnimes(categoryID, letter, search, animeType, order, limit, offset)
}

func (s *AnimeService) Count(categoryID uint, letter string, search string, animeType string) (int64, error) {
	return s.repo.CountAnimes(categoryID, letter, search, animeType)
}

func (s *AnimeService) GetLatest(limit int) ([]domain.Anime, error) {
	return s.repo.GetLatestAnimes(limit)
}

func (s *AnimeService) GetByType(animeType string, limit int) ([]domain.Anime, error) {
	return s.repo.GetAnimesByType(animeType, limit)
}

func (s *AnimeService) GetByID(id uint) (*domain.Anime, error) {
	return s.repo.GetAnimeByID(id)
}

func (s *AnimeService) GetBySlug(slug string) (*domain.Anime, error) {
	return s.repo.GetAnimeBySlug(slug)
}

func (s *AnimeService) Update(anime *domain.Anime) (*domain.Anime, error) {
	existing, err := s.repo.GetAnimeByID(anime.ID)
	if err != nil {
		return nil, err
	}

	// Update fields
	existing.Title = anime.Title
	existing.TitleEn = anime.TitleEn
	existing.Description = anime.Description
	existing.DescriptionEn = anime.DescriptionEn
	existing.Category = anime.Category
	existing.Seasons = anime.Seasons
	existing.Status = anime.Status
	existing.ReleaseDate = anime.ReleaseDate
	existing.Rating = anime.Rating
	existing.Image = anime.Image
	existing.Cover = anime.Cover
	existing.StudioName = anime.StudioName
	existing.Slug = anime.Slug
	existing.SlugEn = anime.SlugEn
	existing.Duration = anime.Duration
	existing.Language = anime.Language
	existing.Trailer = anime.Trailer
	existing.Type = anime.Type
	existing.IsPublished = anime.IsPublished
	existing.UpdatedAt = time.Now()

	if err := s.repo.UpdateAnime(existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (s *AnimeService) Delete(id uint) error {
	return s.repo.DeleteAnime(id)
}

func (s *AnimeService) Search(query string) ([]domain.Anime, error) {
	return s.repo.SearchAnimes(query)
}
