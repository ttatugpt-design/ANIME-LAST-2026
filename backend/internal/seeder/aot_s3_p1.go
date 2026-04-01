package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedAoTS3P1(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Attack on Titan Season 3 Part 1 هجوم العمالقة الموسم الثالث - الجزء الأول",
		TitleEn:       "Attack on Titan Season 3 Part 1",
		Slug:          "aot-s3-p1",
		SlugEn:        "aot-s3-p1",
		Description:   "يتحول الصراع من العمالقة إلى البشر. فيلق الاستطلاع يصبح مطارداً من قبل الحكومة الملكية. يجب على ليفاي وفريقه حماية إيرين وهيستوريا من فرقة القمع الداخلي، وكشف المؤامرة وراء العرش المزور وتاريخ الجدران.",
		DescriptionEn: "The conflict shifts from Titans to humans. The Survey Corps finds itself hunted by the Royal Government. Levi and his squad must protect Eren and Historia from the Interior Police, uncovering the conspiracy behind the fake throne and the history of the walls.",
		Seasons:       3,
		Status:        "Completed",
		Rating:        8.6,
		Image:         "/uploads/animes/aot_s3_p1.jpg",
		Cover:         "/uploads/animes/aot_s3_p1.jpg",
		StudioName:    "Wit Studio",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2018-07-23")

	createAnimeWithEpisodes(db, anime, 12, []string{"action", "dark-fantasy", "military", "shounen", "drama"}, 2018,
		"في هذه الحلقة، يواجه ليفاي خصماً قديماً من ماضيه، بينما يحاول فيلق الاستطلاع النجاة من فخ الحكومة.",
		"In this episode, Levi faces an old rival from his past, as the Survey Corps tries to survive a government trap.")
}
