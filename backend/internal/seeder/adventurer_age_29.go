package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedAdventurerAge29(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "An Adventurer's Daily Grind at Age 29 حياة المغامر اليومية في سن التاسعة والعشرين",
		TitleEn:       "An Adventurer's Daily Grind at Age 29",
		Slug:          "adventurer-daily-grind-age-29",
		SlugEn:        "adventurer-daily-grind-age-29",
		Description:   "كيلي هو مغامر في التاسعة والعشرين من عمره، لا هو ببطل أسطوري ولا بضعيف عاجز. بعد سنوات من العمل الجاد في زنازين المغامرين، تعلم كيف يبقى حياً ويعيش حياة مستقرة بالمعايير الواقعية. حياته هي تنظيف الزنازين بكفاءة، وإنجاز المهام العادية، والعناية بنفسه. لكن عندما يصطحب مبتدئتين شابتين تحت جناحه - لوسيا الساحرة النزقة وكالناء المقاتلة الهادئة - تتحول حياته الروتينية إلى مغامرات غير متوقعة. مغامرات حقيقية لا بطولية، بل إنسانية وعملية، تعكس ما يبدو عليه العمل الجاد فعلاً.",
		DescriptionEn: "Kellie is a 29-year-old adventurer — neither a legendary hero nor a weakling. After years of hard work in adventurers' dungeons, he has learned how to stay alive and live a stable life by realistic standards. His life consists of efficiently clearing dungeons, completing ordinary quests, and taking care of himself. But when he takes two young beginners under his wing — Lucia, the feisty mage, and Kalna, the quiet fighter — his routine life turns into unexpected adventures. Not heroic adventures, but human and practical ones that reflect what hard work actually looks like.",
		Seasons:       1,
		Status:        "Running",
		Rating:        7.8,
		Image:         "/uploads/animes/adventurer_age_29.jpg",
		Cover:         "/uploads/animes/adventurer_age_29.jpg",
		StudioName:    "Kodansha",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   false,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2025-01-08")

	createAnimeWithEpisodes(db, anime, 12, []string{"adventure", "fantasy", "slice-of-life", "comedy"}, 2025,
		"في هذه الحلقة، يستمر كيلي في حياته اليومية كمغامر محترف، مواجهاً تحديات الزنازين والمهام العادية برفقة تلميذتيه الجديدتين في عالم المغامرات.",
		"In this episode, Kellie continues his daily life as a professional adventurer, facing dungeon challenges and ordinary quests alongside his two new apprentices in the world of adventuring.")
}
