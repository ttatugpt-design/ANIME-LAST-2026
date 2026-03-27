package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
)

type ChapterService struct {
	repo port.ChapterRepository
}

func NewChapterService(repo port.ChapterRepository) *ChapterService {
	return &ChapterService{repo: repo}
}

func (s *ChapterService) Create(chapter *domain.Chapter) error {
	return s.repo.CreateChapter(chapter)
}

func (s *ChapterService) GetAll(animeID uint, search string, limit int, offset int) ([]domain.Chapter, error) {
	return s.repo.GetAllChapters(animeID, search, limit, offset)
}

func (s *ChapterService) Count(animeID uint, search string) (int64, error) {
	return s.repo.CountChapters(animeID, search)
}

func (s *ChapterService) GetByID(id uint) (*domain.Chapter, error) {
	return s.repo.GetChapterByID(id)
}

func (s *ChapterService) GetByAnimeID(animeID uint) ([]domain.Chapter, error) {
	return s.repo.GetChaptersByAnimeID(animeID)
}

func (s *ChapterService) Update(chapter *domain.Chapter) error {
	return s.repo.UpdateChapter(chapter)
}

func (s *ChapterService) Delete(id uint) error {
	return s.repo.DeleteChapter(id)
}

func (s *ChapterService) TrackView(id uint) error {
	return s.repo.IncrementChapterViews(id)
}
