package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedOnePunchManS2(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "One Punch Man Season 2 ون بانش مان الموسم الثاني",
		TitleEn:       "One Punch Man Season 2",
		Slug:          "one-punch-man-s2",
		SlugEn:        "one-punch-man-s2",
		Description:   "يستمر سايتاما في حياته كبطل للهواة، لكن هذه المرة يظهر عدو جديد يدعى غارو، وهو صائد الأبطال الذي يسعى لهزيمة أقوى المقاتلين. في هذا الموسم، يواجه الأبطال تحديات أكبر من أي وقت مضى بينما يستمر سايتاما في البحث عن خصم يستحق قوته المذهلة.",
		DescriptionEn: "Saitama continues his life as a hobbyist hero, but this time a new enemy named Garou appears, a hero hunter who seeks to defeat the strongest fighters. In this season, the heroes face greater challenges than ever before as Saitama continues to search for an opponent worthy of his incredible strength.",
		Seasons:       2,
		Status:        "Completed",
		Rating:        8.2,
		Image:         "/uploads/animes/one_punch_man_s2.jpg",
		Cover:         "/uploads/animes/one_punch_man_s2.jpg",
		StudioName:    "J.C.Staff",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2019-04-09")

	createAnimeWithEpisodes(db, anime, 12, []string{"action", "comedy", "supernatural", "seinen"}, 2019,
		"في هذه الحلقة، يواجه الأبطال تهديدات جديدة من غارو، بينما يستمر سايتاما في لفت الأنظار بقوته التي لا تقهر.",
		"In this episode, the heroes face new threats from Garou, as Saitama continues to draw attention with his invincible strength.")
}
