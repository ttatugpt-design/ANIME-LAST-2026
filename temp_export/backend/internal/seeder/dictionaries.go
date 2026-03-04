package seeder

import (
	"backend/internal/core/domain"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

func SeedCategories(db *gorm.DB) {
	categories := []struct{ Ar, En, Slug string }{
		{"أكشن", "Action", "action"},
		{"رعب", "Horror", "horror"},
		{"رومنسي", "Romance", "romance"},
		{"خيال علمي", "Sci-Fi", "sci-fi"},
		{"مغامرات", "Adventure", "adventure"},
		{"كوميدي", "Comedy", "comedy"},
		{"رياضة", "Sports", "sports"},
		{"مدرسي", "School", "school"},
		{"سحر", "Magic", "magic"},
		{"تشويق", "Thriller", "thriller"},
		{"دراما", "Drama", "drama"},
		{"غموض", "Mystery", "mystery"},
		{"تاريخي", "Historical", "historical"},
		{"فانتازيا", "Fantasy", "fantasy"},
		{"خيال مظلم", "Dark Fantasy", "dark-fantasy"},
		{"حياة يومية", "Slice of Life", "slice-of-life"},
		{"موسيقي", "Music", "music"},
		{"حركة وقتال", "Martial Arts", "martial-arts"},
		{"إيتشي", "Ecchi", "ecchi"},
		{"شوجو", "Shoujo", "shoujo"},
		{"شونين", "Shounen", "shounen"},
		{"سينين", "Seinen", "seinen"},
		{"غموض نفسي", "Psychological", "psychological"},
		{"مسرحي", "Theatrical", "theatrical"},
		{"عسكري", "Military", "military"},
		{"خارق للطبيعة", "Supernatural", "supernatural"},
	}

	for _, c := range categories {
		cat := domain.Category{Title: c.Ar, TitleEn: c.En, Name: c.Ar, NameEn: c.En, Slug: c.Slug}
		db.Where("slug = ?", c.Slug).FirstOrCreate(&cat)
	}
}

func SeedTypes(db *gorm.DB) {
	types := []struct{ Ar, En, Slug string }{
		{"مسلسل", "TV", "tv"},
		{"فيلم", "Movie", "movie"},
		{"حلقة خاصة", "Special", "special"},
		{"OVA", "OVA", "ova"},
		{"ONA", "ONA", "ona"},
		{"فيلم قصير", "Short Film", "short-film"},
		{"ميغا حلقة", "Mega Episode", "mega-episode"},
		{"مانجا", "Manga", "manga"},
	}

	for _, t := range types {
		typ := domain.Type{Name: t.Ar, NameEn: t.En, Slug: t.Slug}
		db.Where("slug = ?", t.Slug).FirstOrCreate(&typ)
	}
}

func SeedStudios(db *gorm.DB) {
	studios := []struct{ Name, NameEn, Date string }{
		{"استوديو غيبلي", "Studio Ghibli", "1985-06-15"},
		{"كيوتو أنيميشن", "Kyoto Animation", "1981-06-23"},
		{"توهو", "Toho", "1932-08-31"},
		{"مانغا انيميشن", "Madhouse", "1972-10-16"},
		{"بونز", "Bones", "1998-10-12"},
		{"شانغهاي أنيميشن", "Sunrise", "1972-09-09"},
		{"ديزني", "Disney", "1923-10-16"},
		{"بيكسار", "Pixar", "1986-02-03"},
		{"دريم ووركس", "DreamWorks", "1994-10-12"},
		{"يونيفرسال أنيميشن", "Universal Animation Studios", "1990-01-01"},
		{"فوكوكس أنيميشن", "Fox Animation Studios", "1994-06-01"},
		{"وارنر برذرز أنيميشن", "Warner Bros. Animation", "1980-07-10"},
		{"Pierrot", "Pierrot", "1979-05-01"},               // For Naruto
		{"Toei Animation", "Toei Animation", "1948-01-23"}, // For One Piece
		{"Wit Studio", "Wit Studio", "2012-06-01"},         // For Shingeki
		{"Galaxy Studio", "Galaxy Studio", "2010-01-01"},
		{"Magic Forest Studio", "Magic Forest Studio", "2015-01-01"},
		{"Blue Wave Studio", "Blue Wave Studio", "2018-01-01"},
		{"Urban Studio", "Urban Studio", "2012-01-01"},
		{"Ninja Studio", "Ninja Studio", "2014-01-01"},
		{"Prehistoric Studio", "Prehistoric Studio", "2011-01-01"},
		{"Haunted Studio", "Haunted Studio", "2016-01-01"},
		{"MAPPA", "MAPPA", "2011-06-14"},
		{"White Fox", "White Fox", "2007-04-01"},
	}

	for _, s := range studios {
		studio := domain.Studio{Name: s.Name, NameEn: s.NameEn, Slug: s.NameEn, Date: toDatePtr("2006-01-02", s.Date)}
		db.Where("name_en = ?", s.NameEn).FirstOrCreate(&studio)
	}
}

func SeedLanguages(db *gorm.DB) {
	languages := []struct{ Name, NameEn string }{
		{"المملكة العربية السعودية", "Saudi Arabia"},
		{"مصر", "Egypt"},
		{"اليابان", "Japan"},
		{"الولايات المتحدة", "United States"},
	}

	for _, l := range languages {
		lang := domain.Language{Name: l.Name, NameEn: l.NameEn, Slug: l.NameEn}
		db.Where("name_en = ?", l.NameEn).FirstOrCreate(&lang)
	}
}

func SeedSeasons(db *gorm.DB) {
	seasons := []struct {
		Ar, En string
		Month  int
	}{
		{"الشتاء", "Winter", 1},
		{"الربيع", "Spring", 4},
		{"الصيف", "Summer", 7},
		{"الخريف", "Autumn", 10},
	}

	startYear := 1980
	endYear := 2026

	for year := startYear; year <= endYear; year++ {
		for _, s := range seasons {
			name := fmt.Sprintf("موسم %s - %d", s.Ar, year)
			nameEn := fmt.Sprintf("%s Season - %d", s.En, year)
			slug := fmt.Sprintf("%s-season-%d", strings.ToLower(s.En), year)

			season := domain.Season{
				Name:   name,
				NameEn: nameEn,
				Slug:   slug,
			}
			db.Where("slug = ?", slug).FirstOrCreate(&season)
		}
	}
}
