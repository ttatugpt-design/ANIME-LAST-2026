package seeder

import (
	"backend/internal/core/domain"

	"gorm.io/gorm"
)

func SeedOedoFireSlayer(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Oedo Fire Slayer: The Legend of Phoenix أويدو فاير سلاير: أسطورة العنقاء",
		TitleEn:       "Oedo Fire Slayer: The Legend of Phoenix",
		Slug:          "oedo-fire-slayer",
		SlugEn:        "oedo-fire-slayer",
		Description:   "في مدينة إيدو الكبرى (طوكيو القديمة) خلال عصر إيدو المزدهر، تنشأ أزمة كونية غير متوقعة. كائنات شريرة من عالم آخر تُعرف بـ'الفينيق المظلم' تبدأ في اجتياح المدينة، محرقةً كل شيء تمر به بلهيب لا يمكن إخماده. وسط هذا الفوضى، تتكشّف أسطورة قديمة عن محاربين مختارين يحملون قوة العنقاء المقدسة - وهي الطاقة الوحيدة القادرة على مواجهة النيران المظلمة. كاييدي، فتاة من حي شيتاماتشي المتواضع، تكتشف أنها تحمل تلك القوة في داخلها. تنضم إلى مجموعة من المحاربين المتنوعين: راهب بوذي يتقن فنون الوقاية، وساموراي رونين يبحث عن الفداء، وتاجرة ذكية تستعمل الكيمياء التقليدية سلاحاً. معاً، يشكلون 'قاتلي النيران' - المجموعة الوحيدة الجاهزة لمواجهة الهجوم الملتهب والكشف عن السر الكامن وراء هذا الغزو المظلم قبل أن تؤول مدينتهم رماداً.",
		DescriptionEn: "In the great city of Edo (ancient Tokyo) during the flourishing Edo period, an unexpected cosmic crisis erupts. Evil beings from another world, known as the 'Dark Phoenix,' begin to invade the city, scorching everything in their path with an inextinguishable blaze. Amid this chaos, an ancient legend is revealed about chosen warriors who carry the power of the sacred Phoenix — the only energy capable of facing the dark flames. Kaede, a girl from the humble Shitamachi district, discovers that she carries this power within her. She joins a diverse group of warriors: a Buddhist monk who masters protective arts, a ronin samurai seeking redemption, and a clever merchant who wields traditional alchemy as a weapon. Together, they form the 'Fire Slayers' — the only group ready to face the blazing assault and uncover the secret behind this dark invasion before their city turns to ash.",
		Seasons:       1,
		Status:        "Upcoming",
		Rating:        8.5,
		Image:         "/uploads/animes/oedo_fire_slayer.jpg",
		Cover:         "/uploads/animes/oedo_fire_slayer.jpg",
		StudioName:    "Borotobigumi",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   false,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2025-04-05")

	createAnimeWithEpisodes(db, anime, 12, []string{"action", "historical", "supernatural", "fantasy", "shounen"}, 2025,
		"في هذه الحلقة، تواجه مجموعة قاتلي النيران تحديات جديدة وهم يكشفون المزيد عن أسرار العنقاء المقدسة والكائنات المظلمة التي تهدد مدينة إيدو. تستكشف كاييدي قدراتها الجديدة بينما يتعمق الرفاق في الصراع بين عالمين.",
		"In this episode, the Fire Slayers group faces new challenges as they uncover more secrets about the sacred Phoenix and the dark beings threatening Edo. Kaede explores her new abilities while the companions delve deeper into the conflict between two worlds.")
}
