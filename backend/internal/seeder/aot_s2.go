package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedAoTS2(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Attack on Titan Season 2 هجوم العمالقة الموسم الثاني",
		TitleEn:       "Attack on Titan Season 2",
		Slug:          "aot-s2",
		SlugEn:        "aot-s2",
		Description:   "تستمر معركة البشرية من أجل البقاء. مع اكتشاف عمالقة داخل الجدران وظهور العملاق الوحش الغامض، تدرك فيلق الاستطلاع أن العدو قد يكون أقرب مما يتصورون. تنكشف أسرار صادمة عن هوية العمالقة المتحولين.",
		DescriptionEn: "Humanity's battle for survival continues. With the discovery of Titans within the walls and the appearance of the mysterious Beast Titan, the Survey Corps realizes the enemy might be closer than they imagine. Shocking secrets about the identity of the Titan shifters are revealed.",
		Seasons:       2,
		Status:        "Completed",
		Rating:        8.5,
		Image:         "/uploads/animes/aot_s2.jpg",
		Cover:         "/uploads/animes/aot_s2.jpg",
		StudioName:    "Wit Studio",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2017-04-01")

	createAnimeWithEpisodes(db, anime, 12, []string{"action", "dark-fantasy", "military", "shounen", "mystery"}, 2017,
		"في هذه الحلقة، يطارد فيلق الاستطلاع العمالقة الذين اخترقوا جدار روز، ليكتشفوا حقيقة مرعبة.",
		"In this episode, the Survey Corps chases the Titans who breached Wall Rose, only to discover a terrifying truth.")
}
