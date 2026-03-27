package service

import (
	"backend/config"
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"backend/pkg/token"
	"errors"
	"fmt"
	"strings"

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

func (s *AuthService) Register(name, email, password, avatar string) error {
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
	role, err := s.roleRepo.GetRoleByName("User")
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
		Avatar:   avatar,
	}

	return s.userRepo.CreateUser(user)
}

func (s *AuthService) Login(name, password string) (string, string, *domain.User, error) {
	var user *domain.User
	var err error

	// Handle both username and email
	if strings.Contains(name, "@") {
		user, err = s.userRepo.GetByEmail(name)
	} else {
		user, err = s.userRepo.GetUserByName(name)
	}

	if err != nil || user == nil {
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
