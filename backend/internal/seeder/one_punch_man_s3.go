package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedOnePunchManS3(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "One Punch Man Season 3 ون بانش مان الموسم الثالث",
		TitleEn:       "One Punch Man Season 3",
		Slug:          "one-punch-man-s3",
		SlugEn:        "one-punch-man-s3",
		Description:   "تستمر المعركة الملحمية بين جمعية الأبطال وجمعية الوحوش. بينما يستعد الأبطال لغزو وكر الوحوش، يواصل غارو رحلته في التطور ليصبح 'الوحش البشري' الأقوى. سايتاما، كالعادة، يبحث عن خصم يمكنه الصمود أمامه لأكثر من لكمة واحدة.",
		DescriptionEn: "The epic battle between the Hero Association and the Monster Association continues. As the heroes prepare to invade the monster lair, Garou continues his journey of evolution into the strongest 'Human Monster'. Saitama, as usual, seeks an opponent who can withstand more than a single punch.",
		Seasons:       3,
		Status:        "Running",
		Rating:        8.9,
		Image:         "/uploads/animes/one_punch_man_s3.jpg",
		Cover:         "/uploads/animes/one_punch_man_s3.jpg",
		StudioName:    "J.C.Staff",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2025-10-12")

	createAnimeWithEpisodes(db, anime, 12, []string{"action", "comedy", "supernatural", "seinen"}, 2025,
		"في هذه الحلقة، تحتدم المواجهة بين الأبطال والوحوش، بينما يظهر غارو قوته المرعبة الجديدة.",
		"In this episode, the confrontation between heroes and monsters heats up, while Garou reveals his terrifying new strength.")
}
