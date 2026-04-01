package repository

import (
	"backend/internal/core/domain"
)

func (r *SQLiteRepository) CreateEmbedAccount(acc *domain.EmbedAccount) error {
	return r.db.Create(acc).Error
}

func (r *SQLiteRepository) GetEmbedAccountByID(id uint) (*domain.EmbedAccount, error) {
	var acc domain.EmbedAccount
	err := r.db.First(&acc, id).Error
	return &acc, err
}

func (r *SQLiteRepository) GetAllEmbedAccounts() ([]domain.EmbedAccount, error) {
	var accs []domain.EmbedAccount
	err := r.db.Find(&accs).Error
	return accs, err
}

func (r *SQLiteRepository) UpdateEmbedAccount(acc *domain.EmbedAccount) error {
	return r.db.Save(acc).Error
}

func (r *SQLiteRepository) DeleteEmbedAccount(id uint) error {
	return r.db.Delete(&domain.EmbedAccount{}, id).Error
}
