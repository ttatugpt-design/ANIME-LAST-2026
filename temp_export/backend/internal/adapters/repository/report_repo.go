package repository

import (
	"context"

	"backend/internal/core/domain"

	"gorm.io/gorm"
)

type ReportRepository struct {
	db *gorm.DB
}

func NewReportRepository(db *gorm.DB) *ReportRepository {
	return &ReportRepository{db: db}
}

func (r *ReportRepository) CreateReport(ctx context.Context, report *domain.Report) error {
	return r.db.WithContext(ctx).Create(report).Error
}

func (r *ReportRepository) GetAllReports(ctx context.Context) ([]domain.Report, error) {
	var reports []domain.Report
	if err := r.db.WithContext(ctx).Order("created_at desc").Find(&reports).Error; err != nil {
		return nil, err
	}
	return reports, nil
}
