import api from './api';

// Notification types matching backend
export type NotificationType = 'reply' | 'like' | 'system' | 'new_post' | 'friend_request' | 'friend_request_accepted' | 'friend_request_rejected' | 'chat_message';

export interface NotificationData {
    comment_id?: number;
    parent_id?: number;
    actor_id?: number;
    actor_name?: string;
    actor_avatar?: string;
    // Friend Request specific
    requester_id?: number;
    requester_name?: string;
    requester_avatar?: string;
    accepter_id?: number;
    accepter_name?: string;
    accepter_avatar?: string;
    rejecter_id?: number;
    rejecter_name?: string;
    rejecter_avatar?: string;
    // Chat Message specific
    sender_id?: number;
    sender_name?: string;
    sender_avatar?: string;
    message_content?: string;

    comment_content?: string;
    reply_content?: string;
    episode_id?: number;
    episode_number?: number;
    episode_image?: string;
    anime_id?: number;
    anime_title?: string;
    anime_image?: string;
}

export interface Notification {
    id: number;
    user_id: number;
    type: NotificationType;
    data: NotificationData;
    is_read: boolean;
    created_at: string;
}

// Fetch user notifications
export const fetchNotifications = async (): Promise<Notification[]> => {
    const response = await api.get<Notification[]>('/notifications');
    return response.data;
};

// Mark a single notification as read
export const markNotificationAsRead = async (id: number): Promise<void> => {
    await api.post(`/notifications/${id}/read`);
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<void> => {
    await api.post('/notifications/read-all');
};

// Delete a single notification
export const deleteNotification = async (id: number): Promise<void> => {
    await api.delete(`/notifications/${id}`);
};

// Delete all notifications for the user
export const deleteAllNotifications = async (): Promise<void> => {
    await api.delete('/notifications/clear-all');
};

// Delete selected notifications
export const deleteSelectedNotifications = async (ids: number[]): Promise<void> => {
    await api.post('/notifications/delete-selected', { ids });
};
