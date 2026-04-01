package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedGoldenKamuyS5(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Golden Kamuy Season 5 جولدن كاموي الموسم الخامس",
		TitleEn:       "Golden Kamuy Season 5",
		Slug:          "golden-kamuy-s5",
		SlugEn:        "golden-kamuy-s5",
		Description:   "الموسم الأخير من جولدن كاموي يختتم رحلة سوجيموتو 'الخالد' والفتاة آينو أسيربا في البحث عن الذهب المفقود. مع اقتراب جميع الأطراف من كشف اللغز النهائي للوشوم، تشتعل الصراعات في هوكايدو وتصل المغامرة إلى ذروتها الملحمية.",
		DescriptionEn: "The final season of Golden Kamuy concludes the journey of Sugimoto 'The Immortal' and the Ainu girl Asirpa in their search for the lost gold. As all parties close in on the final mystery of the tattoos, conflicts ignite in Hokkaido and the adventure reaches its epic climax.",
		Seasons:       5,
		Status:        "Running",
		Rating:        8.8,
		Image:         "/uploads/animes/golden_kamuy_s5.jpg",
		Cover:         "/uploads/animes/golden_kamuy_s5.jpg",
		StudioName:    "Brain's Base",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2026-01-05")

	createAnimeWithEpisodes(db, anime, 13, []string{"action", "adventure", "historical", "seinen"}, 2026,
		"في هذه الحلقة، تشتد المطاردة في ثلوج هوكايدو مع اقتراب سوجيموتو وأسيربا من وجهتهم النهائية.",
		"In this episode, the chase intensifies in the snows of Hokkaido as Sugimoto and Asirpa approach their final destination.")
}
