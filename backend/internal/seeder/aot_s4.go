package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedAoTS4(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Attack on Titan The Final Season هجوم العمالقة الموسم الأخير",
		TitleEn:       "Attack on Titan The Final Season",
		Slug:          "aot-s4",
		SlugEn:        "aot-s4",
		Description:   "تتوسع آفاق القصة لتشمل العالم وراء البحر. تنكشف الحقيقة المأساوية عن ماري وإلديا. إيرين ييغر والجميع يواجهون خيارات صعبة ستغير مصير العالم إلى الأبد. تبدأ الحرب الشاملة التي ستضع حداً لمعاناة استمرت لآلاف السنين.",
		DescriptionEn: "The story's horizons expand to include the world across the sea. The tragic truth about Marley and Eldia is revealed. Eren Jaeger and the others face difficult choices that will change the fate of the world forever. The all-out war begins, promising to end a suffering that has lasted for thousands of years.",
		Seasons:       4,
		Status:        "Completed",
		Rating:        9.1,
		Image:         "/uploads/animes/aot_s4.jpg",
		Cover:         "/uploads/animes/aot_s4.jpg",
		StudioName:    "MAPPA",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2020-12-07")

	createAnimeWithEpisodes(db, anime, 28, []string{"action", "dark-fantasy", "military", "shounen", "drama"}, 2020,
		"في هذه الحلقة، تشتعل نيران الحرب في القارة الجديدة، حيث يظهر فيلق الاستطلاع بقوة لم يتوقعها أحد.",
		"In this episode, the fires of war ignite on the new continent, as the Survey Corps appears with a strength no one expected.")
}
