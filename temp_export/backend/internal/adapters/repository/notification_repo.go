package repository

import (
	"backend/internal/core/domain"
	"encoding/json"

	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// Create adds a new notification
func (r *NotificationRepository) Create(notification *domain.Notification) error {
	return r.db.Create(notification).Error
}

// GetUserNotifications fetches unread or recent notifications for a user
func (r *NotificationRepository) GetUserNotifications(userID uint, limit int) ([]domain.Notification, error) {
	var notifications []domain.Notification
	err := r.db.Where("user_id = ?", userID).
		Order("created_at desc").
		Limit(limit).
		Find(&notifications).Error
	return notifications, err
}

// MarkRead marks a notification as read
func (r *NotificationRepository) MarkRead(id uint, userID uint) error {
	return r.db.Model(&domain.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_read", true).Error
}

// MarkAllRead marks all notifications for a user as read
func (r *NotificationRepository) MarkAllRead(userID uint) error {
	return r.db.Model(&domain.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Update("is_read", true).Error
}

// Delete removes a specific notification
func (r *NotificationRepository) Delete(id uint, userID uint) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&domain.Notification{}).Error
}

// DeleteAll removes all notifications for a user
func (r *NotificationRepository) DeleteAll(userID uint) error {
	return r.db.Where("user_id = ?", userID).Delete(&domain.Notification{}).Error
}

// DeleteSelected removes multiple notifications for a user
func (r *NotificationRepository) DeleteSelected(userID uint, ids []uint) error {
	return r.db.Where("user_id = ? AND id IN ?", userID, ids).Delete(&domain.Notification{}).Error
}

// UpdateContentByCommentID updates the content snapshot in notifications where this comment is the subject
func (r *NotificationRepository) UpdateContentByCommentID(commentID uint, newContent string) error {
	var notifications []domain.Notification
	// Find all notifications that might reference this comment_id
	// We use a looser LIKE match first to avoid expensive JSON parsing on every row, then verify in Go
	err := r.db.Where("data LIKE ?", "%\"comment_id\":"+jsonString(commentID)+"%").Find(&notifications).Error
	if err != nil {
		return err
	}

	for i := range notifications {
		var data map[string]interface{}
		if err := json.Unmarshal(notifications[i].Data, &data); err != nil {
			continue
		}

		// Double check comment_id match
		cid, ok := data["comment_id"].(float64)
		if !ok || uint(cid) != commentID {
			continue
		}

		updated := false
		if notifications[i].Type == domain.NotificationTypeReply {
			data["reply_content"] = newContent
			updated = true
		} else if notifications[i].Type == domain.NotificationTypeLike {
			data["comment_content"] = newContent
			updated = true
		}

		if updated {
			newData, _ := json.Marshal(data)
			notifications[i].Data = newData
			r.db.Save(&notifications[i])
		}
	}
	return nil
}

// UpdateContentByParentID updates the content snapshot in notifications where this comment is the parent being replied to
func (r *NotificationRepository) UpdateContentByParentID(parentID uint, newContent string) error {
	var notifications []domain.Notification
	err := r.db.Where("type = ? AND data LIKE ?", domain.NotificationTypeReply, "%\"parent_id\":"+jsonString(parentID)+"%").Find(&notifications).Error
	if err != nil {
		return err
	}

	for i := range notifications {
		var data map[string]interface{}
		if err := json.Unmarshal(notifications[i].Data, &data); err != nil {
			continue
		}

		pid, ok := data["parent_id"].(float64)
		if !ok || uint(pid) != parentID {
			continue
		}

		data["comment_content"] = newContent
		newData, _ := json.Marshal(data)
		notifications[i].Data = newData
		r.db.Save(&notifications[i])
	}
	return nil
}

func jsonString(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

// DeleteByCommentID removes all notifications associated with a comment as the subject
func (r *NotificationRepository) DeleteByCommentID(commentID uint) error {
	// Simple strategy: fetch and delete if matches or use LIKE
	return r.db.Where("data LIKE ?", "%\"comment_id\":"+jsonString(commentID)+"%").Delete(&domain.Notification{}).Error
}

// DeleteByParentID removes all notifications where this comment was the parent being replied to
func (r *NotificationRepository) DeleteByParentID(parentID uint) error {
	return r.db.Where("data LIKE ?", "%\"parent_id\":"+jsonString(parentID)+"%").Delete(&domain.Notification{}).Error
}
func (r *NotificationRepository) CountUnread(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&domain.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Count(&count).Error
	return count, err
}

func (r *NotificationRepository) DeleteMutualFriendNotifications(user1, user2 uint) error {
	u1Str := jsonString(user1)
	u2Str := jsonString(user2)

	// Delete notifications FOR user1 where user2 is the actor
	err := r.db.Where("user_id = ? AND (data LIKE ? OR data LIKE ? OR data LIKE ?)",
		user1,
		"%\"requester_id\":"+u2Str+"%",
		"%\"accepter_id\":"+u2Str+"%",
		"%\"rejecter_id\":"+u2Str+"%").Delete(&domain.Notification{}).Error
	if err != nil {
		return err
	}

	// Delete notifications FOR user2 where user1 is the actor
	err = r.db.Where("user_id = ? AND (data LIKE ? OR data LIKE ? OR data LIKE ?)",
		user2,
		"%\"requester_id\":"+u1Str+"%",
		"%\"accepter_id\":"+u1Str+"%",
		"%\"rejecter_id\":"+u1Str+"%").Delete(&domain.Notification{}).Error

	return err
}
