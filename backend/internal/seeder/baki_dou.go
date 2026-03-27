package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedBakiDou2026(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Baki Dou (2026) باكي دو",
		TitleEn:       "BAKI-DOU: The Invincible Samurai",
		Slug:          "baki-dou-2026",
		SlugEn:        "baki-dou-2026",
		Description:   "تستمر الملحمة بعد المعركة الأسطورية بين باكي هانما ووالده يوجيرو. في مشروع سري للغاية على عمق 364 متراً تحت برجم طوكيو سكاي تري، يتم إحياء الساموراي الأسطوري مياموتو موساشي. مع رفع الحظر عن الأسلحة في الساحة الأرضية، تبدأ مواجهة دموية بين تقنيات السيف القديمة وفنون القتال الحديثة. هل تستطيع قوة باكي مواجهة نصل أقوى ساموراي في التاريخ؟",
		DescriptionEn: "The saga continues after the epic confrontation between Baki Hanma and his father, Yujiro Hanma. In a top-secret project 364 meters beneath the Tokyo Skytree, the legendary samurai Miyamoto Musashi is resurrected. With the ban on weapons lifted in the Underground Arena, a bloody clash begins between ancient sword techniques and modern martial arts. Can Baki's strength stand against the blade of the strongest samurai in history?",
		Seasons:       1,
		Status:        "Upcoming",
		Rating:        8.9,
		Image:         "/uploads/animes/baki_dou_2026.jpg",
		Cover:         "/uploads/animes/baki_dou_2026.jpg", // Using same image for cover as it's the only one provided
		StudioName:    "TMS Entertainment",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   false,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2026-02-26")

	createAnimeWithEpisodes(db, anime, 13, []string{"action", "martial-arts", "shounen", "supernatural"}, 2026,
		"في هذه الحلقة، نشهد بداية الصدام الملحمي بين عالم القتال الحديث وتقنيات الساموراي القديمة، حيث يواجه أقوى المقاتلين تحدياً لم يسبق له مثيل.",
		"In this episode, we witness the beginning of the epic clash between the world of modern fighting and ancient samurai techniques, as the strongest fighters face an unprecedented challenge.")
}
