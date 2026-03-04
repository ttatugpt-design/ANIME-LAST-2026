package repository

import (
	"backend/internal/core/domain"
)

func (r *SQLiteRepository) Create(news *domain.QuickNews) error {
	return r.db.Create(news).Error
}

func (r *SQLiteRepository) GetByID(id uint) (*domain.QuickNews, error) {
	var news domain.QuickNews
	if err := r.db.First(&news, id).Error; err != nil {
		return nil, err
	}
	return &news, nil
}

func (r *SQLiteRepository) GetAll() ([]domain.QuickNews, error) {
	var news []domain.QuickNews
	if err := r.db.Order("created_at desc").Find(&news).Error; err != nil {
		return nil, err
	}
	return news, nil
}

func (r *SQLiteRepository) Update(news *domain.QuickNews) error {
	return r.db.Save(news).Error
}

func (r *SQLiteRepository) Delete(id uint) error {
	return r.db.Delete(&domain.QuickNews{}, id).Error
}
