package seeder

import (
	"backend/internal/core/domain"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// Helper function to create an anime and its episodes
func createAnimeWithEpisodes(db *gorm.DB, animeData domain.Anime, episodeCount int, catSlugs []string, startYear int, descriptionAr, descriptionEn string) {
	// 1. Resolve Season ID
	month := animeData.ReleaseDate.Month()
	var seasonNameEn string
	if month >= 1 && month <= 3 {
		seasonNameEn = fmt.Sprintf("Winter Season - %d", startYear)
	} else if month >= 4 && month <= 6 {
		seasonNameEn = fmt.Sprintf("Spring Season - %d", startYear)
	} else if month >= 7 && month <= 9 {
		seasonNameEn = fmt.Sprintf("Summer Season - %d", startYear)
	} else {
		seasonNameEn = fmt.Sprintf("Autumn Season - %d", startYear)
	}
	var season domain.Season
	if err := db.Where("name_en = ?", seasonNameEn).First(&season).Error; err == nil {
		animeData.SeasonID = &season.ID
	}

	// 2. Resolve Studio ID
	var studio domain.Studio
	if animeData.StudioName != "" {
		if err := db.Where("name_en = ?", animeData.StudioName).First(&studio).Error; err == nil {
			animeData.StudioID = &studio.ID
		}
	}

	// 3. Resolve Language ID
	var lang domain.Language
	if animeData.Language != "" {
		if err := db.Where("name_en = ?", animeData.Language).First(&lang).Error; err == nil {
			animeData.LanguageID = &lang.ID
		}
	}

	// Create anime
	if err := db.Where("slug = ?", animeData.Slug).FirstOrCreate(&animeData).Error; err == nil {
		// Sync Categories
		var cats []domain.Category
		db.Where("slug IN ?", catSlugs).Find(&cats)
		db.Model(&animeData).Association("Categories").Replace(cats)

		// Create episodes
		startDate := time.Date(startYear, 1, 1, 0, 0, 0, 0, time.UTC)

		for i := 1; i <= episodeCount; i++ {
			epNumber := i
			epTitle := fmt.Sprintf("حلقة %d - %s", i, animeData.Title)
			epTitleEn := fmt.Sprintf("Episode %d - %s", i, animeData.TitleEn)
			epSlug := fmt.Sprintf("%s-%d", animeData.Slug, i)

			ep := domain.Episode{
				AnimeID:       animeData.ID,
				Title:         epTitle,
				TitleEn:       epTitleEn,
				Slug:          epSlug,
				SlugEn:        epSlug,
				EpisodeNumber: epNumber,
				Description:   descriptionAr,
				DescriptionEn: descriptionEn,
				Thumbnail:     animeData.Image,
				Banner:        animeData.Cover,
				Duration:      animeData.Duration,
				Quality:       "1080p",
				VideoFormat:   "mp4",
				ReleaseDate:   startDate.AddDate(0, 0, i*7),
				IsPublished:   true,
				Language:      animeData.Language,
				Rating:        8.5,
				VideoURLs:     fmt.Sprintf(`[{"url":"https://video.example.com/%s_ep%d.mp4","type":"ar","name":"Server 1"}]`, animeData.Slug, i),
			}

			db.Where("slug = ?", ep.Slug).FirstOrCreate(&ep)
		}
	}
}

func SeedChainsawMan(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Chainsaw Man Movie: Reze Hen تشينسو مان موفي: رزه هين",
		TitleEn:       "Chainsaw Man Movie: Reze Hen",
		Slug:          "chainsaw-man-movie-reze-hen",
		SlugEn:        "chainsaw-man-movie-reze-hen",
		Description:   "يتبع الفيلم قصة ديني ولقائه مع الشخصية الغامضة رزه...",
		DescriptionEn: "The movie follows Denji's story and his encounter with the mysterious character Reze...",
		Seasons:       1,
		Status:        "Running",
		Rating:        8.6,
		Image:         "/uploads/animes/chainsaw_man_reze.jpg",
		Cover:         "/uploads/animes/chainsaw_man_reze_cover.jpg",
		StudioName:    "MAPPA",
		Duration:      24,
		Language:      "Japan",
		Type:          "Movie",
		IsActive:      true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2024-12-11")

	createAnimeWithEpisodes(db, anime, 1, []string{"action", "dark-fantasy", "supernatural", "shounen"}, 2024,
		"في هذا الفيلم، يواجه ديني تحديات جديدة مع رزه...",
		"In this movie, Denji faces new challenges with Reze...")
}

func SeedFullmetalAlchemist(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Fullmetal Alchemist فلمتال ألكمست",
		TitleEn:       "Fullmetal Alchemist",
		Slug:          "fullmetal-alchemist",
		SlugEn:        "fullmetal-alchemist",
		Description:   "قصة الأخوين إدوارد وألفونس إلريك في رحلتهما للبحث عن حجر الفيلسوف...",
		DescriptionEn: "The story of brothers Edward and Alphonse Elric's journey to find the Philosopher's Stone...",
		Seasons:       1,
		Status:        "Completed",
		Rating:        9.1,
		Image:         "/uploads/animes/fullmetal_alchemist.jpg",
		Cover:         "/uploads/animes/fullmetal_alchemist_cover.jpg",
		StudioName:    "Bones",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsActive:      true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2003-10-04")

	createAnimeWithEpisodes(db, anime, 51, []string{"action", "adventure", "drama", "fantasy", "shounen"}, 2003,
		"في هذه الحلقة، يواصل الأخوان رحلتهما في البحث عن حجر الفيلسوف...",
		"In this episode, the brothers continue their journey searching for the Philosopher's Stone...")
}

func SeedNarutoShippuden(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Naruto Shippuden ناروتو شيبودن",
		TitleEn:       "Naruto Shippuden",
		Slug:          "naruto-shippuden",
		SlugEn:        "naruto-shippuden",
		Description:   "الجزء الثاني من سلسلة ناروتو، حيث يعود ناروتو بعد سنتين من التدريب...",
		DescriptionEn: "The second part of the Naruto series, where Naruto returns after two years of training...",
		Seasons:       1,
		Status:        "Completed",
		Rating:        8.7,
		Image:         "/uploads/animes/naruto_shippuden.jpg",
		Cover:         "/uploads/animes/naruto_shippuden_cover.jpg",
		StudioName:    "Pierrot",
		Duration:      23,
		Language:      "Japan",
		Type:          "TV",
		IsActive:      true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2007-02-15")

	createAnimeWithEpisodes(db, anime, 500, []string{"action", "adventure", "drama", "shounen"}, 2007,
		"في هذه الحلقة، يواصل ناروتو رحلته ليصبح هوكاجي...",
		"In this episode, Naruto continues his journey to become Hokage...")
}

func SeedOnePunchMan(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "One Punch Man ون بانش مان",
		TitleEn:       "One Punch Man",
		Slug:          "one-punch-man",
		SlugEn:        "one-punch-man",
		Description:   "قصة سايتاما، البطل الخارق الذي يستطيع هزيمة أي عدو بلكمة واحدة...",
		DescriptionEn: "The story of Saitama, a superhero who can defeat any enemy with a single punch...",
		Seasons:       1,
		Status:        "Completed",
		Rating:        8.7,
		Image:         "/uploads/animes/one_punch_man.jpg",
		Cover:         "/uploads/animes/one_punch_man_cover.jpg",
		StudioName:    "Madhouse",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsActive:      true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2015-10-05")

	createAnimeWithEpisodes(db, anime, 12, []string{"action", "comedy", "supernatural", "seinen"}, 2015,
		"في هذه الحلقة، يواجه سايتاما أعداء جدد بطريقته الفريدة...",
		"In this episode, Saitama faces new enemies in his unique way...")
}

func SeedSousouNoFrieren(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Sousou no Frieren سوسو نو فريرن",
		TitleEn:       "Frieren: Beyond Journey's End",
		Slug:          "sousou-no-frieren",
		SlugEn:        "sousou-no-frieren",
		Description:   "بعد هزيمة ملك الشياطين، تبدأ فريرن الساحرة الإلفية رحلة جديدة...",
		DescriptionEn: "After defeating the Demon King, the elf mage Frieren begins a new journey...",
		Seasons:       1,
		Status:        "Running",
		Rating:        9.3,
		Image:         "/uploads/animes/frieren.jpg",
		Cover:         "/uploads/animes/frieren_cover.jpg",
		StudioName:    "Madhouse",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsActive:      true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2023-09-29")

	createAnimeWithEpisodes(db, anime, 28, []string{"adventure", "drama", "fantasy", "slice-of-life"}, 2023,
		"في هذه الحلقة، تستكشف فريرن ذكرياتها وتتعلم المزيد عن البشر...",
		"In this episode, Frieren explores her memories and learns more about humans...")
}

func SeedSpyXFamily(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Spy x Family سباي إكس فاميلي",
		TitleEn:       "Spy x Family",
		Slug:          "spy-x-family",
		SlugEn:        "spy-x-family",
		Description:   "جاسوس وقاتلة مأجورة وقارئة أفكار يشكلون عائلة مزيفة...",
		DescriptionEn: "A spy, an assassin, and a telepath form a fake family...",
		Seasons:       1,
		Status:        "Running",
		Rating:        8.7,
		Image:         "/uploads/animes/spy_x_family.jpg",
		Cover:         "/uploads/animes/spy_x_family_cover.jpg",
		StudioName:    "Wit Studio",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsActive:      true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2022-04-09")

	createAnimeWithEpisodes(db, anime, 12, []string{"action", "comedy", "slice-of-life", "shounen"}, 2022,
		"في هذه الحلقة، تواجه العائلة المزيفة تحديات جديدة...",
		"In this episode, the fake family faces new challenges...")
}

func SeedSteinsGate(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Steins;Gate ستينز جيت",
		TitleEn:       "Steins;Gate",
		Slug:          "steins-gate",
		SlugEn:        "steins-gate",
		Description:   "قصة أوكابي رينتارو واكتشافه لطريقة إرسال رسائل إلى الماضي...",
		DescriptionEn: "The story of Okabe Rintaro and his discovery of a way to send messages to the past...",
		Seasons:       1,
		Status:        "Completed",
		Rating:        9.1,
		Image:         "/uploads/animes/steins_gate.jpg",
		Cover:         "/uploads/animes/steins_gate_cover.jpg",
		StudioName:    "White Fox",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsActive:      true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2011-04-06")

	createAnimeWithEpisodes(db, anime, 24, []string{"sci-fi", "thriller", "drama"}, 2011,
		"في هذه الحلقة، يواصل أوكابي تجاربه مع السفر عبر الزمن...",
		"In this episode, Okabe continues his experiments with time travel...")
}

func SeedKingdom6th(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Kingdom 6th Season مملكة الموسم السادس",
		TitleEn:       "Kingdom 6th Season",
		Slug:          "kingdom-6th-season",
		SlugEn:        "kingdom-6th-season",
		Description:   "الموسم السادس من سلسلة Kingdom...",
		DescriptionEn: "The sixth season of the Kingdom series...",
		Seasons:       6,
		Status:        "Running",
		Rating:        8.5,
		Image:         "/uploads/animes/kingdom_s6.jpg",
		Cover:         "/uploads/animes/kingdom_s6_cover.jpg",
		StudioName:    "Pierrot",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsActive:      true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2024-01-06")

	createAnimeWithEpisodes(db, anime, 25, []string{"action", "historical", "military", "seinen"}, 2024,
		"في هذه الحلقة، تستمر المعارك الملحمية في عصر الممالك الصينية...",
		"In this episode, epic battles continue in the era of Chinese kingdoms...")
}
