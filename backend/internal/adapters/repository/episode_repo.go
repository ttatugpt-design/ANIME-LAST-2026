package repository

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

// EpisodeRepository implementation is in port.EpisodeRepository

func (r *SQLiteRepository) CreateEpisode(episode *domain.Episode) error {
	return r.db.Create(episode).Error
}

func (r *SQLiteRepository) GetEpisodeByID(id uint) (*domain.Episode, error) {
	var episode domain.Episode
	err := r.db.Preload("Anime").Preload("Servers").First(&episode, id).Error
	return &episode, err
}

func (r *SQLiteRepository) GetAllEpisodes(categoryID uint, letter string, search string, animeType string, order string, limit int, offset int) ([]domain.Episode, error) {
	var episodes []domain.Episode
	db := r.db.Preload("Anime").Preload("Servers")

	if animeType != "all_admin" {
		db = db.Where("episodes.is_published = ?", true)
	}

	if categoryID > 0 {
		db = db.Joins("JOIN animes ON animes.id = episodes.anime_id").
			Joins("JOIN anime_categories ON anime_categories.anime_id = animes.id").
			Where("anime_categories.category_id = ?", categoryID)
	}

	if search != "" {
		searchPattern := "%" + search + "%"
		db = db.Joins("LEFT JOIN animes as a_search ON a_search.id = episodes.anime_id").
			Where("(episodes.title LIKE ? OR episodes.title_en LIKE ? OR a_search.title LIKE ? OR a_search.title_en LIKE ? OR CAST(episodes.episode_number AS TEXT) LIKE ?)",
				searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	if letter != "" {
		db = db.Joins("LEFT JOIN animes as a2 ON a2.id = episodes.anime_id").
			Where("(a2.title LIKE ? OR a2.title_en LIKE ?) AND a2.type NOT IN (?, ?)", letter+"%", letter+"%", "tv_en", "moves_en")
	} else if animeType == "foreign" {
		db = db.Joins("JOIN animes as a_isolation ON a_isolation.id = episodes.anime_id").
			Where("a_isolation.type IN (?, ?)", "tv_en", "moves_en")
	} else if animeType == "all_admin" {
		// No isolation filter for episodes in admin
		db = db.Joins("JOIN animes as a_isolation ON a_isolation.id = episodes.anime_id")
	} else {
		// Default isolation
		db = db.Joins("JOIN animes as a_isolation ON a_isolation.id = episodes.anime_id").
			Where("a_isolation.type NOT IN (?, ?)", "tv_en", "moves_en")
	}

	if order == "oldest" {
		db = db.Order("episodes.created_at asc")
	} else {
		db = db.Order("episodes.updated_at desc")
	}

	if limit > 0 {
		db = db.Limit(limit).Offset(offset)
	}

	err := db.Find(&episodes).Error
	return episodes, err
}

func (r *SQLiteRepository) CountEpisodes(categoryID uint, letter string, search string, animeType string) (int64, error) {
	var count int64
	db := r.db.Model(&domain.Episode{})

	if animeType != "all_admin" {
		db = db.Where("is_published = ?", true)
	}

	if categoryID > 0 {
		db = db.Joins("JOIN animes ON animes.id = episodes.anime_id").
			Joins("JOIN anime_categories ON anime_categories.anime_id = animes.id").
			Where("anime_categories.category_id = ?", categoryID)
	}

	if search != "" {
		searchPattern := "%" + search + "%"
		db = db.Joins("LEFT JOIN animes as a_search ON a_search.id = episodes.anime_id").
			Where("(episodes.title LIKE ? OR episodes.title_en LIKE ? OR a_search.title LIKE ? OR a_search.title_en LIKE ? OR CAST(episodes.episode_number AS TEXT) LIKE ?)",
				searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	if letter != "" {
		db = db.Joins("LEFT JOIN animes as a2 ON a2.id = episodes.anime_id").
			Where("(a2.title LIKE ? OR a2.title_en LIKE ?) AND a2.type NOT IN (?, ?)", letter+"%", letter+"%", "tv_en", "moves_en")
	} else if animeType == "foreign" {
		db = db.Joins("JOIN animes as a_isolation ON a_isolation.id = episodes.anime_id").
			Where("a_isolation.type IN (?, ?)", "tv_en", "moves_en")
	} else if animeType == "all_admin" {
		db = db.Joins("JOIN animes as a_isolation ON a_isolation.id = episodes.anime_id")
	} else {
		db = db.Joins("JOIN animes as a_isolation ON a_isolation.id = episodes.anime_id").
			Where("a_isolation.type NOT IN (?, ?)", "tv_en", "moves_en")
	}

	err := db.Count(&count).Error
	return count, err
}

func (r *SQLiteRepository) UpdateEpisode(episode *domain.Episode) error {
	// Explicitly update Servers association
	if err := r.db.Model(episode).Association("Servers").Replace(episode.Servers); err != nil {
		return err
	}
	return r.db.Save(episode).Error
}

func (r *SQLiteRepository) DeleteEpisode(id uint) error {
	return r.db.Delete(&domain.Episode{}, id).Error
}

func (r *SQLiteRepository) GetEpisodesByAnimeID(animeID uint) ([]domain.Episode, error) {
	var episodes []domain.Episode
	err := r.db.Preload("Servers").Where("anime_id = ? AND is_published = ?", animeID, true).Find(&episodes).Error
	return episodes, err
}

func (r *SQLiteRepository) GetLatestEpisodes(limit, offset int) ([]domain.Episode, error) {
	var episodes []domain.Episode
	// Preload Anime and Servers and exclude foreign media
	err := r.db.Preload("Anime").Preload("Servers").
		Joins("JOIN animes ON animes.id = episodes.anime_id").
		Where("episodes.is_published = ? AND animes.type NOT IN (?, ?)", true, "tv_en", "moves_en").
		Order("episodes.updated_at desc").Limit(limit).Offset(offset).Find(&episodes).Error
	return episodes, err
}

func (r *SQLiteRepository) SearchEpisodes(query string) ([]domain.Episode, error) {
	var episodes []domain.Episode
	searchPattern := "%" + query + "%"

	err := r.db.Preload("Anime").Preload("Servers").
		Joins("LEFT JOIN animes ON episodes.anime_id = animes.id").
		Where("episodes.is_published = ? AND (episodes.title LIKE ? OR episodes.title_en LIKE ? OR animes.title LIKE ? OR animes.title_en LIKE ? OR CAST(episodes.episode_number AS TEXT) LIKE ?) AND animes.type NOT IN (?, ?)",
			true, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, "tv_en", "moves_en").
		Order("episodes.updated_at desc").
		Limit(50).
		Find(&episodes).Error

	return episodes, err
}

// IncrementEpisodeViews increments the views count for an episode
func (r *SQLiteRepository) IncrementEpisodeViews(episodeID uint) error {
	return r.db.Model(&domain.Episode{}).
		Where("id = ?", episodeID).
		UpdateColumn("views_count", gorm.Expr("views_count + 1")).Error
}
