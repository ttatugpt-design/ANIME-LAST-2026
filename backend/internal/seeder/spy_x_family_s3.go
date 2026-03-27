package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedSpyXFamilyS3(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Spy x Family الموسم الثالث سباي × فاميلي",
		TitleEn:       "Spy x Family Season 3",
		Slug:          "spy-x-family-s3",
		SlugEn:        "spy-x-family-s3",
		Description:   "يستمر لويد فوجر في مهمته السرية تحت غطاء عائلة فورجر. مع تصاعد التوترات السياسية بين غارديا وأوستانيا، يواجه الجاسوس المعروف بـ'تواي لايت' تهديدات جديدة أكثر خطورة من أي وقت مضى. في الوقت ذاته، تواصل آنيا الدراسة في مدرسة إيدن المرموقة لتحقيق حلمها بالوصول إلى الستيلو، بينما تستمر يور في مهامها الخطيرة كقاتلة مأجورة. في هذا الموسم الجديد، تواجه عائلة فورجر اختبارات أشد من السابق تهدد ليس فقط المهمة، بل الروابط العائلية الحقيقية التي نشأت بينهم رغم أن كل شيء بدأ كمسرحية.",
		DescriptionEn: "Lloyd Forger continues his secret mission under the cover of the Forger family. With political tensions rising between Gardia and Ostania, the spy known as 'Twilight' faces new and more dangerous threats than ever before. Meanwhile, Anya continues her studies at the prestigious Eden Academy to achieve her dream of reaching the Stella, while Yor persists in her dangerous duties as an assassin. In this new season, the Forger family faces tougher tests than before that threaten not only the mission, but the real family bonds that formed between them — even though everything started as a charade.",
		Seasons:       3,
		Status:        "Upcoming",
		Rating:        8.7,
		Image:         "/uploads/animes/spy_x_family_s3.jpg",
		Cover:         "/uploads/animes/spy_x_family_s3.jpg",
		StudioName:    "Wit Studio",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   false,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2025-10-04")

	createAnimeWithEpisodes(db, anime, 12, []string{"action", "comedy", "slice-of-life", "shounen"}, 2025,
		"في هذه الحلقة، تواجه عائلة فوجر تحديات جديدة تختبر قوة الروابط التي جمعتهم، بينما يحاول لويد الموازنة بين مهامه الجاسوسية الخطيرة وحياته العائلية.",
		"In this episode, the Forger family faces new challenges that test the strength of their bonds, as Lloyd struggles to balance his dangerous spy duties with family life.")
}
