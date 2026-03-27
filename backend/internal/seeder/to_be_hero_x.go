package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedToBeHeroX(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "To Be Hero X توبي هيرو إكس",
		TitleEn:       "To Be Hero X",
		Slug:          "to-be-hero-x",
		SlugEn:        "to-be-hero-x",
		Description:   "في عالم يحكمه الأبطال الخارقون، يستيقظ شاب اعتيادي ليجد نفسه في خضم صراع لا يعرف أسبابه. المـX - قوة غامضة تُمنح للمختارين تحديد مصير العالم - بدأت تُغير موازين القوى. يضطر ماين ذو الشخصية المعقدة إلى الانضمام لفريق من الأبطال في بطولة رهيبة يكون فيها الفشل مساوياً للموت. لكن خلف الجلالة الظاهرة للأبطال، تكمن أسرار مظلمة عن النظام الذي يديرهم. هل يختار ماين أن يكون بطلاً بالمعنى التقليدي، أم سيكسر القواعد ليجد طريقه الخاص؟ قصة تمزج الحركة السريعة بأسئلة فلسفية عن معنى البطولة الحقيقية.",
		DescriptionEn: "In a world governed by superheroes, an ordinary young man wakes to find himself in the middle of a conflict he doesn't understand. The X — a mysterious power granted to the chosen to determine the world's fate — has begun shifting the balance of power. Main, with his complex personality, is forced to join a team of heroes in a terrifying tournament where failure equals death. But behind the heroes' apparent grandeur lie dark secrets about the system that controls them. Will Main choose to be a traditional hero, or will he break the rules to forge his own path? A story that blends fast-paced action with philosophical questions about the true meaning of heroism.",
		Seasons:       1,
		Status:        "Running",
		Rating:        8.1,
		Image:         "/uploads/animes/to_be_hero_x.jpg",
		Cover:         "/uploads/animes/to_be_hero_x.jpg",
		StudioName:    "bilibili",
		Duration:      24,
		Language:      "China",
		Type:          "TV",
		IsPublished:   false,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2024-04-13")

	createAnimeWithEpisodes(db, anime, 16, []string{"action", "supernatural", "comedy", "sci-fi"}, 2024,
		"في هذه الحلقة، يواجه ماين تحديات جديدة داخل بطولة الأبطال، حيث يكتشف المزيد من الأسرار المظلمة المخفية خلف النظام الذي يُدير عالم الأبطال الخارقين.",
		"In this episode, Main faces new challenges within the heroes' tournament, uncovering more dark secrets hidden behind the system that governs the world of superheroes.")
}
