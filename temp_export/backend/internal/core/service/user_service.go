package service

import (
	"backend/internal/adapters/ws"
	"backend/internal/core/domain"
	"backend/internal/core/port"
	"encoding/json"
	"errors"
	"sort"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	repo           port.UserRepository
	roleRepo       port.RoleRepository
	notifRepo      port.NotificationRepository
	historyRepo    port.HistoryRepository
	watchLaterRepo port.WatchLaterRepository
	hub            *ws.Hub
}

func NewUserService(
	repo port.UserRepository,
	roleRepo port.RoleRepository,
	notifRepo port.NotificationRepository,
	historyRepo port.HistoryRepository,
	watchLaterRepo port.WatchLaterRepository,
	hub *ws.Hub,
) *UserService {
	return &UserService{
		repo:           repo,
		roleRepo:       roleRepo,
		notifRepo:      notifRepo,
		historyRepo:    historyRepo,
		watchLaterRepo: watchLaterRepo,
		hub:            hub,
	}
}

func (s *UserService) Create(name, email, password string, roleID uint, avatarPath string) error {
	existing, _ := s.repo.GetByEmail(email)
	if existing != nil {
		return errors.New("email already taken")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := &domain.User{
		Name:     name,
		Email:    email,
		Password: string(hashed),
		RoleID:   roleID,
		Avatar:   avatarPath,
	}

	return s.repo.CreateUser(user)
}

func (s *UserService) GetAll(limit int) ([]domain.User, error) {
	return s.repo.GetAllUsers(limit)
}

func (s *UserService) GetByID(id uint) (*domain.User, error) {
	return s.repo.GetUserByID(id)
}

func (s *UserService) Update(id uint, name, email string, password string, roleID uint, avatarPath string) error {
	user, err := s.repo.GetUserByID(id)
	if err != nil {
		return err
	}

	user.Name = name
	user.Email = email
	user.RoleID = roleID
	if avatarPath != "" {
		user.Avatar = avatarPath
	}
	if password != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		user.Password = string(hashed)
	}

	// Clear the Role struct to ensure GORM updates the foreign key (RoleID)
	// instead of trying to save the old Role association.
	user.Role = domain.Role{}

	return s.repo.UpdateUser(user)
}

func (s *UserService) Delete(id uint) error {
	return s.repo.DeleteUser(id)
}

func (s *UserService) Search(query string) ([]domain.User, error) {
	return s.repo.SearchUsers(query)
}

func (s *UserService) UpdateProfile(id uint, name, currentPassword, newPassword string, avatarPath, coverImagePath string) (*domain.User, error) {
	user, err := s.repo.GetUserByID(id)
	if err != nil {
		return nil, err
	}

	user.Name = name

	if avatarPath != "" {
		user.Avatar = avatarPath
	}
	if coverImagePath != "" {
		user.CoverImage = coverImagePath
	}

	if newPassword != "" {
		if currentPassword == "" {
			return nil, errors.New("current password is required to set a new password")
		}
		// Verify current password
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(currentPassword)); err != nil {
			return nil, errors.New("incorrect current password")
		}
		// Hash new password
		hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		user.Password = string(hashed)
	}

	// Explicitly zero out Role to prevent GORM from trying to update/insert the related role
	user.Role = domain.Role{}

	if err := s.repo.UpdateUser(user); err != nil {
		return nil, err
	}

	return user, nil
}

type UserStats struct {
	NotificationsCount int64 `json:"notifications_count"`
	HistoryCount       int64 `json:"history_count"`
	WatchLaterCount    int64 `json:"watch_later_count"`
	CommentsCount      int64 `json:"comments_count"`
	RepliesCount       int64 `json:"replies_count"`
	LikesCount         int64 `json:"likes_count"`
}

func (s *UserService) GetUserStats(userID uint) (*UserStats, error) {
	stats := &UserStats{}

	unread, err := s.notifRepo.CountUnread(userID)
	if err != nil {
		return nil, err
	}
	stats.NotificationsCount = unread

	history, err := s.historyRepo.CountHistory(userID)
	if err != nil {
		return nil, err
	}
	stats.HistoryCount = history

	watchLater, err := s.watchLaterRepo.CountWatchLater(userID)
	if err != nil {
		return nil, err
	}
	stats.WatchLaterCount = watchLater

	comments, _ := s.repo.CountComments(userID)
	stats.CommentsCount = comments

	replies, _ := s.repo.CountReplies(userID)
	stats.RepliesCount = replies

	likes, _ := s.repo.CountLikes(userID)
	stats.LikesCount = likes

	return stats, nil
}

type Interaction struct {
	ID            uint            `json:"id"`
	Type          string          `json:"type"` // "comment", "reply", "like"
	Content       string          `json:"content"`
	CreatedAt     string          `json:"created_at"`
	Episode       *domain.Episode `json:"episode,omitempty"`
	ParentAuthor  string          `json:"parent_author,omitempty"`
	ParentContent string          `json:"parent_content,omitempty"`
	Comment       *domain.Comment `json:"comment,omitempty"`
}

func (s *UserService) GetPaginatedInteractions(userID uint, interactionType string, limit, offset int) ([]Interaction, bool, error) {
	var interactions []Interaction
	var hasMore bool

	// Fetch one extra item to check if there's more data
	queryLimit := limit + 1

	switch interactionType {
	case "comment":
		comments, err := s.repo.GetCommentsPaginated(userID, queryLimit, offset)
		if err != nil {
			return nil, false, err
		}
		if len(comments) > limit {
			hasMore = true
			comments = comments[:limit]
		}
		for _, c := range comments {
			interactions = append(interactions, Interaction{
				ID:        c.ID,
				Type:      "comment",
				Content:   c.Content,
				CreatedAt: c.CreatedAt.Format(time.RFC3339),
				Episode:   c.Episode,
				Comment:   &c,
			})
		}

	case "reply":
		replies, err := s.repo.GetRepliesPaginated(userID, queryLimit, offset)
		if err != nil {
			return nil, false, err
		}
		if len(replies) > limit {
			hasMore = true
			replies = replies[:limit]
		}
		for _, c := range replies {
			item := Interaction{
				ID:        c.ID,
				Type:      "reply",
				Content:   c.Content,
				CreatedAt: c.CreatedAt.Format(time.RFC3339),
				Episode:   c.Episode,
				Comment:   &c,
			}
			if c.Parent != nil {
				item.ParentContent = c.Parent.Content
				if c.Parent.User != nil {
					item.ParentAuthor = c.Parent.User.Name
				}
			}
			interactions = append(interactions, item)
		}

	case "like":
		liked, err := s.repo.GetLikedCommentsPaginated(userID, queryLimit, offset)
		if err != nil {
			return nil, false, err
		}
		if len(liked) > limit {
			hasMore = true
			liked = liked[:limit]
		}
		for _, c := range liked {
			item := Interaction{
				ID:        c.ID,
				Type:      "like",
				Content:   c.Content,
				CreatedAt: c.CreatedAt.Format(time.RFC3339),
				Episode:   c.Episode,
				Comment:   &c,
			}
			if c.User != nil {
				item.ParentAuthor = c.User.Name
			}
			interactions = append(interactions, item)
		}

	default:
		// If no type specified, return a combined view (minimal implementation for now)
		// Usually we'd want a common paginated view or error
		return s.GetInteractions(userID) // Fallback or handle differently
	}

	return interactions, hasMore, nil
}

func (s *UserService) GetInteractions(userID uint) ([]Interaction, bool, error) {
	comments, _ := s.repo.GetCommentsByUserID(userID)
	liked, _ := s.repo.GetLikedCommentsByUserID(userID)

	var interactions []Interaction

	for _, c := range comments {
		item := Interaction{
			ID:        c.ID,
			CreatedAt: c.CreatedAt.Format(time.RFC3339),
			Content:   c.Content,
			Episode:   c.Episode,
			Comment:   &c,
		}
		if c.ParentID != nil && *c.ParentID != 0 {
			item.Type = "reply"
			if c.Parent != nil {
				item.ParentContent = c.Parent.Content
				if c.Parent.User != nil {
					item.ParentAuthor = c.Parent.User.Name
				}
			}
		} else {
			item.Type = "comment"
		}
		interactions = append(interactions, item)
	}

	for _, c := range liked {
		item := Interaction{
			ID:        c.ID,
			Type:      "like",
			Content:   c.Content,
			CreatedAt: c.CreatedAt.Format(time.RFC3339),
			Episode:   c.Episode,
			Comment:   &c,
		}
		if c.User != nil {
			item.ParentAuthor = c.User.Name
		}
		interactions = append(interactions, item)
	}

	sort.Slice(interactions, func(i, j int) bool {
		return interactions[i].CreatedAt > interactions[j].CreatedAt
	})

	return interactions, false, nil
}

// --- Friendship Service ---

func (s *UserService) SendFriendRequest(requesterID, addresseeID uint) error {
	if requesterID == addresseeID {
		return errors.New("cannot add yourself")
	}

	// Check if blocked
	blocked, err := s.repo.IsBlocked(requesterID, addresseeID)
	if err != nil {
		return err
	}
	if blocked {
		return errors.New("cannot send request")
	}

	// Check existing friendship
	existing, err := s.repo.GetFriendship(requesterID, addresseeID)
	if err == nil && existing != nil {
		if existing.Status == "accepted" {
			return errors.New("already friends")
		}
		if existing.Status == "pending" {
			return errors.New("request already pending")
		}
	}

	friendship := &domain.Friendship{
		RequesterID: requesterID,
		AddresseeID: addresseeID,
		Status:      "pending",
	}
	if err := s.repo.CreateFriendship(friendship); err != nil {
		return err
	}

	// Create Notification for Addressee
	// Fetch requester name for notification data
	requester, _ := s.repo.GetUserByID(requesterID)
	data := map[string]interface{}{
		"requester_id":     requesterID,
		"requester_name":   requester.Name,
		"requester_avatar": requester.Avatar,
	}
	jsonData, _ := json.Marshal(data)

	notif := &domain.Notification{
		UserID:    addresseeID,
		Type:      domain.NotificationTypeFriendRequest,
		Data:      domain.RawJSON(jsonData),
		CreatedAt: time.Now(),
		IsRead:    false,
	}

	if err := s.notifRepo.Create(notif); err == nil {
		// Broadcast to User
		msg := map[string]interface{}{
			"type": "notification",
			"data": notif,
		}
		s.hub.BroadcastToUser(addresseeID, "notification", msg)
	}

	return nil
}

func (s *UserService) AcceptFriendRequest(userID, requestID uint) error {
	// Logic: Get friendship by ID (or user pairs), verify user is addressee
	// Since GetFriendship uses user IDs, better to fetch by ID or logic
	// For simplicity, let's assume we pass the *other* user ID (requester)
	// OR we fetch the friendship by ID if repo supported it.
	// The repo method `GetFriendship` takes 2 user IDs.

	friendship, err := s.repo.GetFriendship(userID, requestID) // Here requestID is the OTHER user ID
	if err != nil {
		return errors.New("friendship not found")
	}

	if friendship.AddresseeID != userID {
		return errors.New("not authorized to accept this request")
	}

	friendship.Status = "accepted"
	if err := s.repo.UpdateFriendship(friendship); err != nil {
		return err
	}

	// Notify Requester that request was accepted
	accepter, _ := s.repo.GetUserByID(userID)
	data := map[string]interface{}{
		"accepter_id":     userID,
		"accepter_name":   accepter.Name,
		"accepter_avatar": accepter.Avatar,
	}
	jsonData, _ := json.Marshal(data)

	notif := &domain.Notification{
		UserID:    friendship.RequesterID,
		Type:      domain.NotificationTypeFriendRequestAccepted,
		Data:      domain.RawJSON(jsonData),
		CreatedAt: time.Now(),
		IsRead:    false,
	}

	if err := s.notifRepo.Create(notif); err == nil {
		msg := map[string]interface{}{
			"type": "notification",
			"data": notif,
		}
		s.hub.BroadcastToUser(friendship.RequesterID, "notification", msg)
	}

	return nil
}

func (s *UserService) RejectFriendRequest(userID, otherUserID uint) error {
	friendship, err := s.repo.GetFriendship(userID, otherUserID)
	if err != nil {
		return errors.New("friendship not found")
	}

	// Delete friendship first (or after, doesn't matter much, but logically reject implies deletion)
	if err := s.repo.DeleteFriendship(friendship.ID); err != nil {
		return err
	}

	// Only notify if the rejecter is NOT the original requester (meaning it's a rejection, not a cancellation)
	if userID == friendship.RequesterID {
		return nil
	}

	// Notify Requester that request was rejected
	// userID is the one rejecting (Addressee)
	rejecter, _ := s.repo.GetUserByID(userID)
	data := map[string]interface{}{
		"rejecter_id":     userID,
		"rejecter_name":   rejecter.Name,
		"rejecter_avatar": rejecter.Avatar,
	}
	jsonData, _ := json.Marshal(data)

	notif := &domain.Notification{
		UserID:    friendship.RequesterID,
		Type:      domain.NotificationTypeFriendRequestRejected,
		Data:      domain.RawJSON(jsonData),
		CreatedAt: time.Now(),
		IsRead:    false,
	}

	if err := s.notifRepo.Create(notif); err == nil {
		msg := map[string]interface{}{
			"type": "notification",
			"data": notif,
		}
		s.hub.BroadcastToUser(friendship.RequesterID, "notification", msg)
	}

	return nil
}

func (s *UserService) GetFriendshipStatus(user1, user2 uint) (string, error) {
	if user1 == user2 {
		return "self", nil
	}

	// Check Block
	block, err := s.repo.GetBlock(user1, user2) // Did I block him?
	if err == nil && block != nil {
		return "blocked_by_me", nil
	}
	block, err = s.repo.GetBlock(user2, user1) // Did he block me?
	if err == nil && block != nil {
		return "blocked_me", nil
	}

	friendship, err := s.repo.GetFriendship(user1, user2)
	if err != nil {
		return "none", nil
	}

	if friendship.Status == "accepted" {
		return "friends", nil
	}
	if friendship.Status == "pending" {
		if friendship.RequesterID == user1 {
			return "pending_sent", nil
		}
		return "pending_received", nil
	}

	return "none", nil
}

func (s *UserService) GetUserFriends(userID uint) ([]domain.User, error) {
	return s.repo.GetFriends(userID)
}

func (s *UserService) GetPendingRequests(userID uint) ([]domain.Friendship, error) {
	return s.repo.GetPendingRequests(userID)
}

// --- Block Service ---

func (s *UserService) BlockUser(blockerID, blockedID uint) error {
	if blockerID == blockedID {
		return errors.New("cannot block yourself")
	}

	// Remove friendship and related notifications if exists
	friendship, err := s.repo.GetFriendship(blockerID, blockedID)
	if err == nil && friendship != nil {
		s.repo.DeleteFriendship(friendship.ID)
		// Cleanup mutual friend-related notifications
		s.notifRepo.DeleteMutualFriendNotifications(blockerID, blockedID)
	}

	block := &domain.Block{
		BlockerID: blockerID,
		BlockedID: blockedID,
	}
	if err := s.repo.CreateBlock(block); err != nil {
		return err
	}

	// Send real-time event to the BLOCKED user (Silent - no notification record)
	msg := map[string]interface{}{
		"type": "user_blocked",
		"data": map[string]interface{}{
			"blocker_id": blockerID,
		},
	}
	s.hub.BroadcastToUser(blockedID, "user_blocked", msg)

	return nil
}

func (s *UserService) UnblockUser(blockerID, blockedID uint) error {
	return s.repo.DeleteBlock(blockerID, blockedID)
}
