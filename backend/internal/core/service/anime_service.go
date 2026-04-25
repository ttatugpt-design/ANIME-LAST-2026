package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"time"
)

type AnimeService struct {
	repo        port.AnimeRepository
	episodeRepo port.EpisodeRepository
}

func NewAnimeService(repo port.AnimeRepository, episodeRepo port.EpisodeRepository) *AnimeService {
	return &AnimeService{
		repo:        repo,
		episodeRepo: episodeRepo,
	}
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

func (s *AnimeService) Update(anime *domain.Anime, cascadeEpisodes bool) (*domain.Anime, error) {
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

	// Image updates + clearing confusion/blurred versions if changed
	if anime.Image != "" && anime.Image != existing.Image {
		existing.Image = anime.Image
		existing.PosterImageConfusion = "" // Clear blurred version so it doesn't show old image
	}
	if anime.Cover != "" && anime.Cover != existing.Cover {
		existing.Cover = anime.Cover
		existing.BannerImageConfusion = "" // Clear blurred version
	}
	if anime.IconImage != "" {
		existing.IconImage = anime.IconImage
	}

	existing.SeasonID = anime.SeasonID
	existing.StudioID = anime.StudioID
	existing.LanguageID = anime.LanguageID
	existing.StudioName = anime.StudioName
	existing.Slug = anime.Slug
	existing.SlugEn = anime.SlugEn
	existing.Duration = anime.Duration
	existing.Language = anime.Language
	existing.Trailer = anime.Trailer
	existing.Type = anime.Type

	// Update Categories (Many-to-Many)
	if len(anime.Categories) > 0 {
		existing.Categories = anime.Categories
	} else if len(anime.CategoryIDs) > 0 {
		// If only IDs are provided
		existing.Categories = make([]domain.Category, len(anime.CategoryIDs))
		for i, id := range anime.CategoryIDs {
			existing.Categories[i] = domain.Category{ID: id}
		}
	}

	// Cascade publication status
	if existing.IsPublished != anime.IsPublished && cascadeEpisodes {
		_ = s.episodeRepo.UpdateEpisodesStatusByAnimeID(anime.ID, anime.IsPublished)
	}

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

func (s *AnimeService) GetUniqueServers(animeID uint) ([]string, error) {
	return s.repo.GetUniqueServerNamesByAnimeID(animeID)
}

func (s *AnimeService) DeleteServersBulk(animeID uint, names []string) error {
	return s.repo.DeleteServersByAnimeIDAndNames(animeID, names)
}

func (s *AnimeService) UpdateServerPriority(animeID uint, priority string) error {
	return s.repo.UpdateServerPriority(animeID, priority)
}
