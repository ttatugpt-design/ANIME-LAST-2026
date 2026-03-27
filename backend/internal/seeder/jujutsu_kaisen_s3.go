package seeder

import (
	"backend/internal/core/domain"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func SeedJujutsuKaisenS3(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Jujutsu Kaisen: The Culling Game جوجوتسو كايسن: لعبة الإعدام",
		TitleEn:       "Jujutsu Kaisen: The Culling Game",
		Slug:          "jujutsu-kaisen-the-culling-game",
		SlugEn:        "jujutsu-kaisen-the-culling-game",
		Description:   "بعد حادثة شيبويا المدمرة، تبدأ 'لعبة الإعدام' الغامضة التي خطط لها كينجاكو. يضطر السحرة واللاعبون الجدد إلى القتال في مناطق مغلقة في جميع أنحاء اليابان، بينما يحاول يوجي وميجومي إيجاد وسيلة لإنقاذ الآخرين وإيقاف اللعبة المميتة.",
		DescriptionEn: "After the devastating Shibuya Incident, the mysterious 'Culling Game' planned by Kenjaku begins. Sorcerers and new players are forced to fight in sealed colonies across Japan, while Yuji and Megumi try to find a way to save others and stop the deadly game.",
		Seasons:       3,
		Status:        "Running",
		Rating:        8.8,
		Image:         "/uploads/animes/jujutsu_kaisen_s3.jpg",
		Cover:         "/uploads/animes/jujutsu_kaisen_s3.jpg",
		StudioName:    "MAPPA",
		Duration:      24,
		Language:      "Japan",
		Type:          "TV",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "2025-01-01")

	links := []string{
		"https://myvidplay.com/e/kgr4jvkml0hs",
		"https://myvidplay.com/e/wtzl67r5kg5a",
		"https://myvidplay.com/e/7yvipw1o3sl3",
		"https://myvidplay.com/e/u5b443qrhboy",
		"https://myvidplay.com/e/ranlhebd4s6q",
		"https://myvidplay.com/e/abvocxye4vxj",
		"https://myvidplay.com/e/pmbdgvp7rwrz",
		"https://myvidplay.com/e/d9pubv2xyjxm",
		"https://myvidplay.com/e/8m5l2ri01kh1",
		"https://myvidplay.com/e/rgd8cujidnze",
		"https://myvidplay.com/e/h56mucbvmkhc",
	}

	createJujutsuS3WithEpisodes(db, anime, links, []string{"action", "dark-fantasy", "supernatural", "shounen"}, 2025)
}

func createJujutsuS3WithEpisodes(db *gorm.DB, animeData domain.Anime, links []string, catSlugs []string, startYear int) {
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

	// Create/Update anime
	db.Where(domain.Anime{Slug: animeData.Slug}).Assign(animeData).FirstOrCreate(&animeData)
	db.Model(&animeData).Update("is_published", animeData.IsPublished)
	
	// Sync Categories
	var cats []domain.Category
	db.Where("slug IN ?", catSlugs).Find(&cats)
	db.Model(&animeData).Association("Categories").Replace(cats)

	// Create episodes
	startDate := time.Date(startYear, 1, 1, 0, 0, 0, 0, time.UTC)

	for i, link := range links {
		epNumber := i + 1
		epTitle := fmt.Sprintf("حلقة %d - %s", epNumber, animeData.Title)
		epTitleEn := fmt.Sprintf("Episode %d - %s", epNumber, animeData.TitleEn)
		epSlug := fmt.Sprintf("%s-%d", animeData.Slug, epNumber)

		ep := domain.Episode{
			AnimeID:       animeData.ID,
			Title:         epTitle,
			TitleEn:       epTitleEn,
			Slug:          epSlug,
			SlugEn:        epSlug,
			EpisodeNumber: epNumber,
			Description:   animeData.Description,
			DescriptionEn: animeData.DescriptionEn,
			Thumbnail:     animeData.Image,
			Banner:        animeData.Cover,
			Duration:      animeData.Duration,
			Quality:       "1080p",
			VideoFormat:   "mp4",
			ReleaseDate:   startDate.AddDate(0, 0, epNumber*7),
			IsPublished:   animeData.IsPublished,
			Language:      animeData.Language,
			Rating:        8.5,
			VideoURLs:     fmt.Sprintf(`[{"url":"%s","type":"ar","name":"عربي"}]`, link),
		}

		// Force update fields to ensure links are correct
		db.Where(domain.Episode{Slug: ep.Slug}).Assign(ep).FirstOrCreate(&ep)
		
		// Also ensure Servers table is populated
		server := domain.EpisodeServer{
			EpisodeID: ep.ID,
			Language:  "ar",
			Name:      "عربي",
			URL:       link,
			Type:      "embed",
		}
		
		// Replace/Create server for this episode
		db.Where(domain.EpisodeServer{EpisodeID: ep.ID, Language: "ar"}).Assign(server).FirstOrCreate(&server)
		
		db.Model(&ep).Update("is_published", animeData.IsPublished)
	}
}
