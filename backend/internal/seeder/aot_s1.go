package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedAoTS1(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Attack on Titan Season 1 هجوم العمالقة الموسم الأول",
		TitleEn:       "Attack on Titan Season 1",
		Slug:          "aot-s1",
		SlugEn:        "aot-s1",
		Description:   "منذ قرون، تعرضت البشرية للإبادة من قبل العمالقة. يعيش الناجون الآن داخل جدران ضخمة. لكن السلام الهش ينكسر عندما يظهر عملاق ضخم ويخترق الجدار الخارجي. يقسم إيرين ييغر على الانتقام وإبادة كل عملاق بعد أن شاهد مأساة مدينته.",
		DescriptionEn: "Centuries ago, humanity was nearly exterminated by Titans. Survivors now live inside massive walls. But the fragile peace is broken when a colossal Titan appears and breaches the outer wall. Eren Jaeger vows revenge and to exterminate every Titan after witnessing the tragedy of his town.",
		Seasons:       1,
		Status:        "Completed",
		Rating:        9.0,
		Image:         "/uploads/animes/aot_s1.jpg",
		Cover:         "/uploads/animes/aot_s1.jpg",
		StudioName:    "Wit Studio",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2013-04-07")

	createAnimeWithEpisodes(db, anime, 25, []string{"action", "dark-fantasy", "military", "shounen", "drama"}, 2013,
		"في هذه الحلقة، يواجه المتدربون الجدد هجوماً مفاجئاً من العمالقة يختبر شجاعتهم وقدرتهم على البقاء.",
		"In this episode, the new trainees face a sudden Titan attack that tests their courage and survival skills.")
}
