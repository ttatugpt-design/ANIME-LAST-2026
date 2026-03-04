package service

import (
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"errors"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"
)

type ModelService struct {
	repo port.ModelRepository
}

func NewModelService(repo port.ModelRepository) *ModelService {
	return &ModelService{repo: repo}
}

func (s *ModelService) Upload(name string, title string, file *multipart.FileHeader, image *multipart.FileHeader, miniBlur *multipart.FileHeader, category string) (*domain.Model, error) {
	// 1. Validate extension
	ext := filepath.Ext(file.Filename)
	if ext != ".fbx" && ext != ".glb" && ext != ".gltf" && ext != ".bvh" {
		return nil, errors.New("invalid file type. Only FBX, GLB/GLTF and BVH allowed")
	}

	// 2. Validate size (e.g., max 100MB)
	if file.Size > 100*1024*1024 {
		return nil, errors.New("file too large. Max 100MB allowed")
	}

	// 3. Create upload directory
	uploadDir := "uploads/models"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return nil, err
	}

	// 4. Save model file
	filename := time.Now().Format("20060102150405") + "_" + file.Filename
	path := filepath.Join(uploadDir, filename)

	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	dst, err := os.Create(path)
	if err != nil {
		return nil, err
	}
	defer dst.Close()

	if _, err = io.Copy(dst, src); err != nil {
		return nil, err
	}

	// 5. Save image file (if provided)
	var imagePath string
	if image != nil {
		imageDir := "uploads/images"
		if err := os.MkdirAll(imageDir, os.ModePerm); err != nil {
			os.Remove(path) // Cleanup model file
			return nil, err
		}

		// Use the filename as-is (frontend already renamed it to title.ext)
		imageFilename := image.Filename
		imagePath = filepath.Join(imageDir, imageFilename)

		imgSrc, err := image.Open()
		if err != nil {
			os.Remove(path)
			return nil, err
		}
		defer imgSrc.Close()

		imgDst, err := os.Create(imagePath)
		if err != nil {
			os.Remove(path)
			return nil, err
		}
		defer imgDst.Close()

		if _, err = io.Copy(imgDst, imgSrc); err != nil {
			os.Remove(path)
			return nil, err
		}
	}

	// 5.5 Save mini blur file (if provided)
	var miniBlurPath string
	if miniBlur != nil {
		imageDir := "uploads/images"
		// Ensure dir exists (already done above, but safe to call again or check)
		if err := os.MkdirAll(imageDir, os.ModePerm); err != nil {
			// cleanup checks...
			os.Remove(path)
			if imagePath != "" {
				os.Remove(imagePath)
			}
			return nil, err
		}

		// Use the filename as-is (frontend already renamed it to title-blur.jpg)
		blurFilename := miniBlur.Filename
		miniBlurPath = filepath.Join(imageDir, blurFilename)

		blurSrc, err := miniBlur.Open()
		if err != nil {
			os.Remove(path)
			if imagePath != "" {
				os.Remove(imagePath)
			}
			return nil, err
		}
		defer blurSrc.Close()

		blurDst, err := os.Create(miniBlurPath)
		if err != nil {
			os.Remove(path)
			if imagePath != "" {
				os.Remove(imagePath)
			}
			return nil, err
		}
		defer blurDst.Close()

		if _, err = io.Copy(blurDst, blurSrc); err != nil {
			os.Remove(path)
			if imagePath != "" {
				os.Remove(imagePath)
			}
			return nil, err
		}
	}

	// 6. Save to DB
	model := &domain.Model{
		Name:         name,
		Title:        title,
		Path:         path,
		Image:        imagePath,
		MiniBlurPath: miniBlurPath,
		Category:     category,
		Size:         file.Size,
		Type:         ext[1:], // remove dot
	}

	if err := s.repo.CreateModel(model); err != nil {
		os.Remove(path)
		if imagePath != "" {
			os.Remove(imagePath)
		}
		if miniBlurPath != "" {
			os.Remove(miniBlurPath)
		}
		return nil, err
	}

	return model, nil
}

func (s *ModelService) GetAll() ([]domain.Model, error) {
	return s.repo.GetAllModels()
}

func (s *ModelService) Update(id uint, name string, title string, image *multipart.FileHeader, miniBlur *multipart.FileHeader, category string) (*domain.Model, error) {
	// 1. Get existing model
	model, err := s.repo.GetModelByID(id)
	if err != nil {
		return nil, err
	}

	// 2. Update fields
	if name != "" {
		model.Name = name
	}
	if title != "" {
		model.Title = title
	}
	if category != "" {
		model.Category = category
	}

	// 3. Handle Image Update
	imageDir := "uploads/images"
	if image != nil || miniBlur != nil {
		if err := os.MkdirAll(imageDir, os.ModePerm); err != nil {
			return nil, err
		}
	}

	if image != nil {
		// Save new image (use filename as-is from frontend)
		imageFilename := image.Filename
		newImagePath := filepath.Join(imageDir, imageFilename)

		src, err := image.Open()
		if err != nil {
			return nil, err
		}
		defer src.Close()

		dst, err := os.Create(newImagePath)
		if err != nil {
			return nil, err
		}
		defer dst.Close()

		if _, err = io.Copy(dst, src); err != nil {
			return nil, err
		}

		// Delete old image if it exists
		if model.Image != "" {
			os.Remove(model.Image)
		}

		model.Image = newImagePath
	}

	// 3.5 Handle Mini Blur Update
	if miniBlur != nil {
		// Save new blur (use filename as-is from frontend)
		blurFilename := miniBlur.Filename
		newBlurPath := filepath.Join(imageDir, blurFilename)

		src, err := miniBlur.Open()
		if err != nil {
			return nil, err
		}
		defer src.Close()

		dst, err := os.Create(newBlurPath)
		if err != nil {
			return nil, err
		}
		defer dst.Close()

		if _, err = io.Copy(dst, src); err != nil {
			return nil, err
		}

		// Delete old blur if it exists
		if model.MiniBlurPath != "" {
			os.Remove(model.MiniBlurPath)
		}

		model.MiniBlurPath = newBlurPath
	}

	model.UpdatedAt = time.Now()

	// 4. Save to DB
	if err := s.repo.UpdateModel(model); err != nil {
		return nil, err
	}

	return model, nil
}

func (s *ModelService) Delete(id uint) error {
	model, err := s.repo.GetModelByID(id)
	if err != nil {
		return err
	}

	// Delete file
	if err := os.Remove(model.Path); err != nil && !os.IsNotExist(err) {
		// Log error but continue
	}

	// Delete image
	if model.Image != "" {
		if err := os.Remove(model.Image); err != nil && !os.IsNotExist(err) {
			// Log error but continue
		}
	}

	return s.repo.DeleteModel(id)
}

func (s *ModelService) GetByID(id uint) (*domain.Model, error) {
	return s.repo.GetModelByID(id)
}
