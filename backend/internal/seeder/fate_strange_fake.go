package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedFateStrangeFake(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Fate/strange Fake فيت/سترينج فيك",
		TitleEn:       "Fate/strange Fake",
		Slug:          "fate-strange-fake",
		SlugEn:        "fate-strange-fake",
		Description:   "تجري أحداث القصة في مدينة سنوفيلد الأمريكية، حيث تبدأ حرب الكأس المقدسة المزيفة. بسبب نقص البيانات والنسخ غير المكتمل للطقوس، تظهر فئات خدم غير عادية وتخرج الأمور عن السيطرة في معركة ملحمية تجمع بين السحرة والأبطال الأسطوريين.",
		DescriptionEn: "The story takes place in the American city of Snowfield, where a False Holy Grail War begins. Due to incomplete data and ritual copying, unusual servant classes appear, and things spiral out of control in an epic battle between magi and legendary heroes.",
		Seasons:       1,
		Status:        "Running",
		Rating:        8.4,
		Image:         "/uploads/animes/fate_strange_fake.jpg",
		Cover:         "/uploads/animes/fate_strange_fake.jpg",
		StudioName:    "A-1 Pictures",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2024-12-31")

	createAnimeWithEpisodes(db, anime, 13, []string{"action", "fantasy", "supernatural", "magic"}, 2026,
		"في هذه الحلقة، تبدأ أحداث حرب الكأس المقدسة المزيفة في مدينة سنوفيلد، حيث يتم استدعاء أول الخدم المجهولين.",
		"In this episode, the events of the False Holy Grail War begin in Snowfield, as the first of the unknown servants are summoned.")
}
