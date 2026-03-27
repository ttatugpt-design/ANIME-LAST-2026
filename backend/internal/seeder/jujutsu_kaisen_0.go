package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedJujutsuKaisen0(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Jujutsu Kaisen 0 فيلم جوجوتسو كايسن: الصفر",
		TitleEn:       "Jujutsu Kaisen 0: The Movie",
		Slug:          "jujutsu-kaisen-0",
		SlugEn:        "jujutsu-kaisen-0",
		Description:   "يوتا أوكوتسو فتى يعاني من لعنة قروكي ريكا، صديقته الطفولة التي أعادت روحها كشيطان ضخم يحميه بشكل أعمى. بسبب القوة الهائلة المدمرة لريكا، يتم إرسال يوتا إلى المدرسة الفنية للتعليم العالي الطقوسية طوكيو حيث يتعلم تحت إشراف الأستاذ ساتوروا غوجو. هناك يجد يوتا أخيراً سبباً للعيش وعائلة جديدة من المحاربين. غير أن سوغورو غيتو، ساحر متمرد يسعى للاستيلاء على كل المارقين، يضع مخططاً لمهاجمة طوكيو ليلة عيد الميلاد. يضطر يوتا إلى مواجهة حقيقة علاقته مع ريكا والتساؤل: هل الحب وحده يكفي لكسر اللعنة؟",
		DescriptionEn: "Yuta Okkotsu is a boy haunted by the curse of Rika Orimoto, his childhood friend whose spirit returned as a massive demon that blindly protects him. Due to Rika's tremendous destructive power, Yuta is sent to Tokyo Jujutsu High School where he trains under the guidance of Master Satoru Gojo. There, Yuta finally finds a reason to live and a new family of warriors. However, Suguru Geto, a rogue sorcerer seeking to claim all cursed spirits, hatches a plot to attack Tokyo on Christmas Eve. Yuta is forced to confront the truth of his relationship with Rika and ask: is love alone enough to break the curse?",
		Seasons:       1,
		Status:        "Completed",
		Rating:        8.4,
		Image:         "/uploads/animes/jujutsu_kaisen_0.jpg",
		Cover:         "/uploads/animes/jujutsu_kaisen_0.jpg",
		StudioName:    "MAPPA",
		Duration:      105,
		Language:      "Japan",
		Type:          "Movie",
		IsPublished:   false,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2021-12-24")

	createAnimeWithEpisodes(db, anime, 1, []string{"action", "dark-fantasy", "supernatural", "shounen"}, 2021,
		"في هذا الفيلم، يواجه يوتا أوكوتسو قوة اللعنة المرتبطة بصديقته ريكا، محاولاً إيجاد سبب للعيش وطريقة لتحرير كليهما من ثقل الماضي المؤلم.",
		"In this movie, Yuta Okkotsu faces the cursed power tied to his friend Rika, trying to find a reason to live and a way to free them both from the weight of a painful past.")
}
