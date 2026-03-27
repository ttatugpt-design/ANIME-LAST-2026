package seeder

import (
	"backend/internal/core/domain"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"gorm.io/gorm"
)

func SeedBerserkManga(db *gorm.DB) {
	anime := domain.Anime{
		Title:         "Berserk بيرسيرك",
		TitleEn:       "Berserk",
		Slug:          "berserk-manga",
		SlugEn:        "berserk-manga",
		Description:   "تتمحور القصة حول غاتس، المحارب الملقب بـ \"السياف الأسود\" الذي يسعى للانتقام من صديقه السابق غريفيث الذي خانه وضحى برفاقه من أجل طموحاته الأنانية. في عالم مظلم مليء بالشياطين والفساد، يشق غاتس طريقه بسيفه الضخم \"قاتل التنانين\"، متحدياً القدر نفسه ومواجهاً أهوالاً لا تتخيلها العقول. القصة تغوص في أعماق الطبيعة البشرية، الصداقة، الخيانة، والإرادة التي لا تقهر.",
		DescriptionEn: "The story follows Guts, a lone mercenary known as the 'Black Swordsman' who seeks revenge against his former friend Griffith, who betrayed him and sacrificed their comrades for his own selfish ambitions. In a dark world filled with demons and corruption, Guts carves his path with his massive sword, the 'Dragon Slayer,' defying fate itself and facing horrors beyond imagination. The story dives deep into human nature, friendship, betrayal, and unyielding will.",
		Seasons:       1,
		Status:        "Ongoing",
		Rating:        9.4,
		Image:         "/uploads/animes/berserk_manga.jpg",
		Cover:         "/uploads/animes/berserk_manga.jpg",
		StudioName:    "Young Animal",
		Duration:      0,
		Language:      "Japan",
		Type:          "manga",
		IsPublished:   true,
	}
	anime.ReleaseDate = toDatePtr("2006-01-02", "1989-08-25")

	// 1. Create Anime
	createAnimeWithChapters(db, anime, 0, []string{"action", "dark-fantasy", "seinen", "horror", "military"}, 1989, "", "")

	// Get the created anime
	var seededAnime domain.Anime
	db.Where("slug = ?", anime.Slug).First(&seededAnime)

	// 2. Delete any existing episodes for this anime (since it's a manga)
	db.Where("anime_id = ?", seededAnime.ID).Delete(&domain.Episode{})

	// 3. Setup Chapter 0
	chTitle := "الفصل 0"
	chTitleEn := "Chapter 0"
	chSlug := "berserk-ch-0"

	chapter := domain.Chapter{
		AnimeID:       seededAnime.ID,
		Title:         chTitle,
		TitleEn:       chTitleEn,
		Slug:          chSlug,
		SlugEn:        chSlug,
		ChapterNumber: 0,
		IsPublished:   true,
	}

	// 4. Handle Images
	sourceDir := `c:\Users\Abdo\Desktop\ANIME\ANIME-GOLANG\manga\berserk\الفصل 0`
	targetSubFolder := filepath.Join("manga", "Berserk", "الفصل 0")
	targetDir := filepath.Join(".", "uploads", targetSubFolder)

	// Create target directory
	if _, err := os.Stat(targetDir); os.IsNotExist(err) {
		os.MkdirAll(targetDir, 0755)
	}

	var imageList []string
	files, _ := os.ReadDir(sourceDir)
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		srcPath := filepath.Join(sourceDir, f.Name())
		destPath := filepath.Join(targetDir, f.Name())

		// Copy file
		if err := copyFile(srcPath, destPath); err == nil {
			relUrl := fmt.Sprintf("/uploads/%s/%s", strings.ReplaceAll(targetSubFolder, "\\", "/"), f.Name())
			imageList = append(imageList, relUrl)
		}
	}

	// chapter.Images should be a JSON array string
	imagesJson, _ := json.Marshal(imageList)
	chapter.Images = string(imagesJson)

	// Save or Update Chapter
	db.Where("slug = ?", chapter.Slug).FirstOrCreate(&chapter)
	db.Model(&chapter).Update("images", chapter.Images)
}

func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}
