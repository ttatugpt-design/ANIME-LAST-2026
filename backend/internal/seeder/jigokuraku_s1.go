package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedJigokurakuS1(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Hell's Paradise: Jigokuraku جحيم الجنة",
		TitleEn:       "Hell's Paradise",
		Slug:          "jigokuraku-s1",
		SlugEn:        "jigokuraku-s1",
		Description:   "يُحكم على غابيمارو 'الفراغ'، وهو نينجا أسطوري من قرية إيواغاكوري، بالإعدام. ولكنه يحصل على فرصة ثانية: إذا تمكن من العثور على إكسير الحياة في جزيرة غامضة يُشاع أنها الجنة، فسيتم العفو عنه تماماً. ينطلق في رحلة خطيرة مع الجلادة ساغيري، ليجدا جزيرة مليئة بالرعب والكائنات الغامضة.",
		DescriptionEn: "Gabimaru the Hollow, a legendary ninja from Iwagakure village, is sentenced to death. However, he gets a second chance: if he can find the Elixir of Life on a mysterious island rumored to be paradise, he will receive a full pardon. He sets off on a dangerous journey with the executioner Sagiri, only to find an island filled with horror and mysterious beings.",
		Seasons:       1,
		Status:        "Completed",
		Rating:        8.3,
		Image:         "/uploads/animes/jigokuraku_s1.jpg",
		Cover:         "/uploads/animes/jigokuraku_s1.jpg",
		StudioName:    "MAPPA",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2023-04-01")

	createAnimeWithEpisodes(db, anime, 13, []string{"action", "adventure", "fantasy", "shounen", "supernatural"}, 2023,
		"في هذه الحلقة، يصل غابيمارو والمحكوم عليهم الآخرون إلى الجزيرة الغامضة ويبدأون في مواجهة أخطارها غير المتوقعة.",
		"In this episode, Gabimaru and the other convicts arrive on the mysterious island and begin to face its unexpected dangers.")
}
