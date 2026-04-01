package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
)

type EmbedAccountService struct {
	repo port.EmbedAccountRepository
}

func NewEmbedAccountService(repo port.EmbedAccountRepository) *EmbedAccountService {
	return &EmbedAccountService{repo: repo}
}

func (s *EmbedAccountService) Create(acc *domain.EmbedAccount) error {
	return s.repo.CreateEmbedAccount(acc)
}

func (s *EmbedAccountService) GetByID(id uint) (*domain.EmbedAccount, error) {
	return s.repo.GetEmbedAccountByID(id)
}

func (s *EmbedAccountService) GetAll() ([]domain.EmbedAccount, error) {
	return s.repo.GetAllEmbedAccounts()
}

func (s *EmbedAccountService) Update(acc *domain.EmbedAccount) error {
	return s.repo.UpdateEmbedAccount(acc)
}

func (s *EmbedAccountService) Delete(id uint) error {
	return s.repo.DeleteEmbedAccount(id)
}
