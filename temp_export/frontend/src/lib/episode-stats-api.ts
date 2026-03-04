import api from './api';

export interface EpisodeStats {
    views_count: number;
    likes_count: number;
    dislikes_count: number;
    user_reaction?: 'like' | 'dislike' | null;
}

/**
 * Track a view for an episode
 */
export const trackEpisodeView = async (episodeId: number): Promise<void> => {
    try {
        await api.post(`/episodes/${episodeId}/view`);
    } catch (error) {
        console.error('Failed to track episode view:', error);
        // Silently fail - view tracking shouldn't block the user experience
    }
};

/**
 * Toggle like/dislike reaction for an episode
 */
export const toggleEpisodeReaction = async (
    episodeId: number,
    isLike: boolean
): Promise<EpisodeStats> => {
    const response = await api.post(`/episodes/${episodeId}/reactions`, {
        is_like: isLike,
    });
    return response.data;
};

/**
 * Get episode statistics including user's reaction
 */
export const getEpisodeStats = async (episodeId: number): Promise<EpisodeStats> => {
    const response = await api.get(`/episodes/${episodeId}/stats`);
    return response.data;
};
