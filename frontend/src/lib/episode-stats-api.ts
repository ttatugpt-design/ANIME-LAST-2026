import api from './api';

export interface EpisodeStats {
    views_count: number;
    likes_count: number;
    loves_count: number;
    hahas_count: number;
    wows_count: number;
    sads_count: number;
    angrys_count: number;
    super_sads_count: number;
    dislikes_count: number;
    user_reaction?: string | null;
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
 * Toggle reaction for an episode
 */
export const toggleEpisodeReaction = async (
    episodeId: number,
    reactionType: string
): Promise<EpisodeStats> => {
    const response = await api.post(`/episodes/${episodeId}/reactions`, {
        type: reactionType,
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
