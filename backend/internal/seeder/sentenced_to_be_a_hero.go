package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedSentencedToBeAHero(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Sentenced to Be a Hero محكوم عليه بأن يكون بطلاً",
		TitleEn:       "Sentenced to Be a Hero",
		Slug:          "sentenced-to-be-a-hero",
		SlugEn:        "sentenced-to-be-a-hero",
		Description:   "في هذا العالم، البطولة هي عقوبة لأبشع المجرمين. زايلو فوربارتز، قائد سابق للفرسان المقدسين مدان بقتل إلهة، يقود وحدة الأبطال الجنائيين 9004. يُجبرون على القتال في الخطوط الأمامية ضد جيش ملك الشياطين، والموت ليس مهرباً لأنهم يُبعثون باستمرار لمواصلة القتال.",
		DescriptionEn: "In this world, heroism is a punishment for the worst criminals. Xylo Forbartz, a former Holy Knight commander convicted of killing a goddess, leads Penal Hero Unit 9004. They are forced to fight on the front lines against the Demon Lord's army; death is not an escape as they are constantly resurrected to continue the battle.",
		Seasons:       1,
		Status:        "Running",
		Rating:        7.8,
		Image:         "/uploads/animes/sentenced_to_be_a_hero.jpg",
		Cover:         "/uploads/animes/sentenced_to_be_a_hero.jpg",
		StudioName:    "Studio Kai",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2026-01-03")

	createAnimeWithEpisodes(db, anime, 12, []string{"action", "fantasy", "dark-fantasy"}, 2026,
		"في هذه الحلقة، يواجه زايلو وفريقه هجوماً يائساً من جيش الشياطين، حيث يظهر معنى 'البطولة كعقوبة' بشكل جلي.",
		"In this episode, Xylo and his squad face a desperate attack from the Demon Army, as the meaning of 'Heroism as Punishment' is clearly revealed.")
}
