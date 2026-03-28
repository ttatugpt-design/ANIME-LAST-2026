package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedTheDarwinIncident(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "The Darwin Incident حادثة داروين",
		TitleEn:       "The Darwin Incident",
		Slug:          "the-darwin-incident",
		SlugEn:        "the-darwin-incident",
		Description:   "قصة تدور حول 'تشارلي'، وهو هيمانزي (نصف إنسان ونصف شمبانزي) يعيش في مجتمع بشري. يتعرض تشارلي للتهميش والتهديدات من جماعات متطرفة بينما يحاول العثور على مكانه في العالم وفهم طبيعته الفريدة، مما يجعل قصته رمزاً لقضايا الهوية والأخلاق والعلم.",
		DescriptionEn: "A story about 'Charlie,' a humanzee (half-human, half-chimpanzee) living in human society. Charlie faces marginalization and threats from extremist groups as he tries to find his place in the world and understand his unique nature, making his story a symbol of issues related to identity, ethics, and science.",
		Seasons:       1,
		Status:        "Upcoming",
		Rating:        8.5,
		Image:         "/uploads/animes/the_darwin_incident.jpg",
		Cover:         "/uploads/animes/the_darwin_incident.jpg",
		StudioName:    "Unknown",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2025-01-01")

	createAnimeWithEpisodes(db, anime, 12, []string{"drama", "sci-fi", "thriller", "seinen"}, 2025,
		"في هذه الحلقة، يبدأ تشارلي حياته الجديدة في المجتمع البشري، لكن التحديات والتهديدات تلاحقه منذ اللحظة الأولى.",
		"In this episode, Charlie begins his new life in human society, but challenges and threats follow him from the very first moment.")
}
