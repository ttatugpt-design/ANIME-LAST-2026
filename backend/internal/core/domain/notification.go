package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// RawJSON is a wrapper around json.RawMessage that handles SQLite scanning correctly
// SQLite sometimes returns JSON as a string, which json.RawMessage cannot scan directly.
type RawJSON json.RawMessage

// Scan implements the sql.Scanner interface
func (j *RawJSON) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("unsupported type: %T", value)
	}

	*j = append((*j)[0:0], bytes...)
	return nil
}

// Value implements the driver.Valuer interface
func (j RawJSON) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return string(j), nil
}

// MarshalJSON implements json.Marshaler
func (j RawJSON) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return json.Marshal(json.RawMessage(j))
}

// UnmarshalJSON implements json.Unmarshaler
func (j *RawJSON) UnmarshalJSON(data []byte) error {
	if j == nil {
		return fmt.Errorf("RawJSON: UnmarshalJSON on nil pointer")
	}
	var m json.RawMessage
	if err := json.Unmarshal(data, &m); err != nil {
		return err
	}
	*j = RawJSON(m)
	return nil
}

// NotificationType defines the type of notification
type NotificationType string

const (
	NotificationTypeReply                 NotificationType = "reply"
	NotificationTypeLike                  NotificationType = "like"
	NotificationTypeSystem                NotificationType = "system"
	NotificationTypeNewPost               NotificationType = "new_post" // New anime/episode
	NotificationTypeFriendRequest         NotificationType = "friend_request"
	NotificationTypeFriendRequestAccepted NotificationType = "friend_request_accepted"
	NotificationTypeFriendRequestRejected NotificationType = "friend_request_rejected"
	NotificationTypeChatMessage           NotificationType = "chat_message"
)

// Notification represents a user notification
type Notification struct {
	ID        uint             `json:"id" gorm:"primaryKey"`
	UserID    uint             `json:"user_id" gorm:"not null"` // Recipient
	Type      NotificationType `json:"type" gorm:"size:50;not null"`
	Data      RawJSON          `json:"data"` // Flexible payload (e.g. { "comment_id": 123, "actor_name": "John" })
	IsRead    bool             `json:"is_read" gorm:"default:false"`
	CreatedAt time.Time        `json:"created_at"`
}
