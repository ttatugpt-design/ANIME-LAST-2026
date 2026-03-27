package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedReZeroS3(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Re:Zero - Starting Life in Another World Season 3 ري:زيرو الموسم الثالث",
		TitleEn:       "Re:Zero - Starting Life in Another World Season 3",
		Slug:          "re-zero-s3",
		SlugEn:        "re-zero-s3",
		Description:   "يستمر سوباروا ناتسوكي في رحلته الشاقة في عالم آخر، حاملاً عبء قدرته الفريدة 'العودة بالموت'. بعد الأحداث المأساوية في مملكة لوغوس وقلعة شادولاند، يواجه سوباروا الآن تهديداً أشد فتكاً من ذي قبل. الفصائل الأربع الكبرى تتصادم، والمجهول يزداد سواداً. وبينما يسعى لحماية إيميليا وأصدقائه من خطر الإبادة التامة، يضطر سوباروا إلى مواجهة الشياطين الداخلية في نفسه وتساؤلات عميقة عن قدره الحقيقي. هذا الموسم يكشف أسراراً صادمة عن طبيعة عالم أيجوس وماضي شخصياته الرئيسية.",
		DescriptionEn: "Subaru Natsuki continues his arduous journey in another world, bearing the burden of his unique ability 'Return by Death'. After the tragic events at the Kingdom of Lugnica and Pleiades Watchtower, Subaru now faces a deadlier threat than ever. The four Great Factions collide, and the unknown grows darker. As he strives to protect Emilia and his friends from total annihilation, Subaru must confront inner demons and deep questions about his true destiny. This season reveals shocking secrets about the nature of the world of Eidos and the past of its main characters.",
		Seasons:       3,
		Status:        "Running",
		Rating:        9.0,
		Image:         "/uploads/animes/re_zero_s3.jpg",
		Cover:         "/uploads/animes/re_zero_s3.jpg",
		StudioName:    "White Fox",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   false,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2024-10-03")

	createAnimeWithEpisodes(db, anime, 25, []string{"action", "drama", "fantasy", "psychological", "romance"}, 2024,
		"في هذه الحلقة، يواصل سوباروا كفاحه في العالم الآخر مستخدماً قدرته على العودة بالموت للتغلب على التحديات التي تبدو مستحيلة، بينما تتكشف أسرار جديدة عن هذا العالم الغامض.",
		"In this episode, Subaru continues his struggle in another world using his Return by Death ability to overcome seemingly impossible challenges, as new secrets about this mysterious world are revealed.")
}
