package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
)

type CategoryService struct {
	repo port.CategoryRepository
}

func NewCategoryService(repo port.CategoryRepository) *CategoryService {
	return &CategoryService{repo: repo}
}

func (s *CategoryService) Create(name, nameEn, slug, description, image, status string) (*domain.Category, error) {
	category := &domain.Category{
		Name:        name,
		NameEn:      nameEn,
		Slug:        slug,
		Description: description,
		Image:       image,
		Status:      status,
	}
	if err := s.repo.CreateCategory(category); err != nil {
		return nil, err
	}
	return category, nil
}

func (s *CategoryService) GetAll() ([]domain.Category, error) {
	return s.repo.GetAllCategories()
}

func (s *CategoryService) Update(id uint, name, nameEn, slug, description, image, status string) (*domain.Category, error) {
	category, err := s.repo.GetCategoryByID(id)
	if err != nil {
		return nil, err
	}

	category.Name = name
	category.NameEn = nameEn
	category.Slug = slug
	category.Description = description
	category.Image = image
	category.Status = status

	if err := s.repo.UpdateCategory(category); err != nil {
		return nil, err
	}
	return category, nil
}

func (s *CategoryService) Delete(id uint) error {
	return s.repo.DeleteCategory(id)
}
