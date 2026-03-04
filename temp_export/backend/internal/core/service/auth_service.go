package service

import (
	"backend/config"
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"backend/pkg/token"
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo port.UserRepository
	roleRepo port.RoleRepository
	config   *config.Config
}

func NewAuthService(userRepo port.UserRepository, roleRepo port.RoleRepository, cfg *config.Config) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		roleRepo: roleRepo,
		config:   cfg,
	}
}

func (s *AuthService) Register(name, email, password string) error {
	// Check if user exists
	existing, _ := s.userRepo.GetByEmail(email)
	if existing != nil {
		return errors.New("user already exists")
	}

	// Hash password
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Assign default role (e.g., "User")
	role, err := s.roleRepo.GetByName("User")
	if err != nil {
		// Fallback or error - simplistic for now. Seeders should ensure roles exist.
		// For safety, error out or create if not exists (seeders better).
		return fmt.Errorf("default role not found: %w", err)
	}

	user := &domain.User{
		Name:     name,
		Email:    email,
		Password: string(hashed),
		RoleID:   role.ID,
	}

	return s.userRepo.CreateUser(user)
}

func (s *AuthService) Login(email, password string) (string, string, *domain.User, error) {
	user, err := s.userRepo.GetByEmail(email)
	if err != nil {
		return "", "", nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return "", "", nil, errors.New("invalid credentials")
	}

	at, rt, err := token.GenerateTokenPair(user.ID, user.Role.Name, s.config.JWTSecret, s.config.RTSecret)
	if err != nil {
		return "", "", nil, err
	}

	return at, rt, user, nil
}

func (s *AuthService) Refresh(refreshToken string) (string, error) {
	claims, err := token.ValidateToken(refreshToken, s.config.RTSecret)
	if err != nil {
		return "", err
	}

	return token.GenerateAccessToken(claims.UserID, claims.Role, s.config.JWTSecret)
}
