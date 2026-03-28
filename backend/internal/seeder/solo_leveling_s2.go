package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedSoloLevelingS2(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Solo Leveling Season 2: Arise from the Shadow سولو ليفيلينغ الموسم الثاني",
		TitleEn:       "Solo Leveling Season 2: Arise from the Shadow",
		Slug:          "solo-leveling-s2",
		SlugEn:        "solo-leveling-s2",
		Description:   "يعود سونغ جين وو في هذا الجزء الجديد بعد أن أصبح ملك الظلال. يواجه تحديات هائلة وأعداء من خارج هذا العالم بينما يحاول حماية البشرية وتطوير جيشه من الظلال الخالدة. هذا الموسم يعد بمقاطع قتالية ملحمية تكشف المزيد عن سر نظام رفع المستويات.",
		DescriptionEn: "Sung Jinwoo returns in this new installment after becoming the Shadow Monarch. He faces massive challenges and enemies from beyond this world while trying to protect humanity and develop his army of immortal shadows. This season promises epic combat sequences that reveal more about the secrets of the leveling system.",
		Seasons:       2,
		Status:        "Upcoming",
		Rating:        8.9,
		Image:         "/uploads/animes/solo_leveling_s2.jpg",
		Cover:         "/uploads/animes/solo_leveling_s2.jpg",
		StudioName:    "A-1 Pictures",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2025-01-01")

	createAnimeWithEpisodes(db, anime, 12, []string{"action", "fantasy", "supernatural", "adventure"}, 2025,
		"في هذه الحلقة، يستعرض سونغ جين وو قوته الجديدة كملك للظلال أمام الوحوش والأعداء الذين يهددون سلامة العالم.",
		"In this episode, Sung Jinwoo showcases his new strength as the Shadow Monarch against the monsters and enemies that threaten the world's safety.")
}
