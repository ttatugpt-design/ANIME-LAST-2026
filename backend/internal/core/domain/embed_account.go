package domain

import (
	"time"

	"gorm.io/gorm"
)

type EmbedAccount struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"not null" json:"name"`
	ApiKey    string         `gorm:"not null" json:"api_key"`
	Type               string         `gorm:"not null;default:'doodstream'" json:"type"`
	LinkedAccountsJSON string         `gorm:"type:text" json:"linked_accounts_json"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
