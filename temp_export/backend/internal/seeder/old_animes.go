package seeder

import (
	"backend/internal/core/domain"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func SeedDeathNote(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Death Note",
		TitleEn:       "Death Note",
		Slug:          "death-note",
		SlugEn:        "death-note",
		Description:   "الأنمي يتحدث عن ياغامي لايت، طالب متفوق يعثر على مذكرة موت تسقط من عالم الشينيغامي...",
		DescriptionEn: "The anime follows Light Yagami, a top student who finds a Death Note...",
		Seasons:       1,
		Status:        "Completed",
		Rating:        9.0,
		Image:         "/uploads/animes/death_note.jpg",
		Cover:         "/uploads/animes/death_note_cover.jpg",
		StudioName:    "Madhouse",
		Duration:      23,
		Language:      "Japan", // Mapped to seeded Language NameEn
		Type:          "TV",    // Mapped to seeded Type NameEn
		IsActive:      true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2006-10-04")

	// Categories
	catSlugs := []string{"mystery", "psychological", "thriller", "supernatural", "drama", "shounen"}

	createAnimeWithEpisodes(db, anime, 37, catSlugs, 2006, "Description ...", "Description ...")
}

func SeedNaruto(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Naruto",
		TitleEn:       "Naruto",
		Slug:          "naruto",
		SlugEn:        "naruto",
		Description:   "رحلة Naruto Uzumaki ليصبح أقوى نينجا في قريته...",
		DescriptionEn: "The journey of Naruto Uzumaki to become the strongest ninja...",
		Seasons:       1,
		Status:        "Completed",
		Rating:        9.0,
		Image:         "/uploads/animes/naruto.jpg",
		Cover:         "/uploads/animes/naruto_cover.jpg",
		StudioName:    "Pierrot",
		Duration:      23,
		Language:      "Japan",
		Type:          "TV",
		IsActive:      true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2002-10-03")

	createAnimeWithEpisodes(db, anime, 500, []string{"action", "thriller", "adventure", "drama", "shounen"}, 2002, "...", "...")
}

func SeedOnePiece(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "One Piece",
		TitleEn:       "One Piece",
		Slug:          "one-piece",
		SlugEn:        "one-piece",
		Description:   "مغامرات Luffy وطاقمه للبحث عن كنز One Piece الأسطوري...",
		DescriptionEn: "The adventures of Luffy and his crew in search of the legendary One Piece treasure...",
		Seasons:       1,
		Status:        "Running",
		Rating:        9.2,
		Image:         "/uploads/animes/one_piece.jpg",
		Cover:         "/uploads/animes/one_piece_cover.jpg",
		StudioName:    "Toei Animation",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsActive:      true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "1999-10-20")

	createAnimeWithEpisodes(db, anime, 500, []string{"action", "thriller", "adventure", "comedy", "drama"}, 1999, "...", "...")
}

func SeedShingeki(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Attack on titan season 3 part 2 الموسم الثالث - الجزء الثاني",
		TitleEn:       "Shingeki no Kyojin Season 3 Part 2",
		Slug:          "Shingeki_no_Kyoj_n_Season_3_Part 2",
		SlugEn:        "Shingeki_no_Kyoj_n_Season_3_Part 2",
		Description:   "الجزء الثاني من الموسم الثالث يركز على معركة إحياء شيغاشينا...",
		DescriptionEn: "The second part of Season 3 focuses on the Battle of Shiganshina...",
		Seasons:       3,
		Status:        "Completed",
		Rating:        9.17,
		Image:         "/uploads/animes/Shingeki_no_Kyoj_n_Season_3_Part 2.jpg",
		Cover:         "/uploads/animes/Shingeki_no_Kyoj_n_Season_3_Part 2_cover.jpg",
		StudioName:    "Wit Studio",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsActive:      true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2019-04-29")

	createAnimeWithEpisodes(db, anime, 10, []string{"action", "dark-fantasy", "military", "adventure", "thriller"}, 2019, "...", "...")
}

// Helpers

func seedEpisodesForAnime(db *gorm.DB, anime *domain.Anime, count int, titleBase, slugBase string, year int) {
	startDate := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)

	for i := 1; i <= count; i++ {
		epNumber := i
		epTitle := fmt.Sprintf("Episode %d - %s", i, titleBase)
		epSlug := fmt.Sprintf("%s-%d", slugBase, i)

		ep := domain.Episode{
			AnimeID:       anime.ID,
			Title:         epTitle,
			TitleEn:       epTitle,
			Slug:          epSlug,
			SlugEn:        epSlug,
			EpisodeNumber: epNumber,
			Description:   "Episode description...",
			DescriptionEn: "Episode description...",
			Thumbnail:     anime.Image,
			Banner:        anime.Cover,
			Duration:      anime.Duration,
			Quality:       "1080p",
			VideoFormat:   "mp4",
			ReleaseDate:   startDate.AddDate(0, 0, i*7),
			IsPublished:   true,
			Language:      anime.Language,
			Rating:        8.5,
			VideoURLs:     fmt.Sprintf(`[{"url":"https://video.example.com/%s_ep%d.mp4","type":"ar","name":"Server 1"}]`, slugBase, i),
		}

		db.Where("slug = ?", ep.Slug).FirstOrCreate(&ep)
	}
}

func seedEpisodesForAnimeIndexed(db *gorm.DB, anime *domain.Anime, count int, startIdx int, titleBase, slugBase string, year int) {
	startDate := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)

	for i := 1; i <= count; i++ {
		epNumber := startIdx + i - 1
		epTitle := fmt.Sprintf("Episode %d - %s", epNumber, titleBase)
		epSlug := fmt.Sprintf("%s-%d", slugBase, epNumber)

		ep := domain.Episode{
			AnimeID:       anime.ID,
			Title:         epTitle,
			TitleEn:       epTitle,
			Slug:          epSlug,
			SlugEn:        epSlug,
			EpisodeNumber: epNumber,
			Description:   "Episode description...",
			DescriptionEn: "Episode description...",
			Thumbnail:     anime.Image,
			Banner:        anime.Cover,
			Duration:      anime.Duration,
			Quality:       "1080p",
			VideoFormat:   "mp4",
			ReleaseDate:   startDate.AddDate(0, 0, i*7),
			IsPublished:   true,
			Language:      anime.Language,
			Rating:        9.0,
			VideoURLs:     fmt.Sprintf(`[{"url":"https://video.example.com/%s_ep%d.mp4","type":"ar","name":"Server 1"}]`, slugBase, epNumber),
		}

		db.Where("slug = ?", ep.Slug).FirstOrCreate(&ep)
	}
}
