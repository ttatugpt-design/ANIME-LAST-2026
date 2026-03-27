export interface PostMedia {
    id: number;
    post_id: number;
    media_type: 'image' | 'video';
    media_url: string;
}

export interface Post {
    id: number;
    user_id: number;
    content: string;
    created_at: string;
    user: {
        id: number;
        name: string;
        avatar?: string;
    };
    media?: PostMedia[];
    images?: { id: number; image_url: string }[]; // Fallback for some components
    
    // Reaction Summary
    likes_count: number;
    loves_count: number;
    sads_count: number;
    angrys_count: number;
    wows_count: number;
    hahas_count: number;
    super_sads_count: number;
    comments_count: number;
    
    // User specific
    user_reaction?: string;
    is_liked: boolean; // Cannot be optional for PostCard compatibility
}

export interface Comment {
    id: number;
    post_id?: number;
    episode_id?: number;
    chapter_id?: number;
    user_id: number;
    content: string;
    created_at: string;
    user: {
        id: number;
        name: string;
        avatar?: string;
    };
    
    // Reaction Summary
    likes_count: number;
    loves_count: number;
    sads_count: number;
    angrys_count: number;
    wows_count: number;
    hahas_count: number;
    super_sads_count: number;
    likes?: number;    // Legacy fallback
    dislikes?: number; // Legacy fallback
    
    // Tree/Thread Data
    children?: Comment[];
    parent_id?: number | null;
    mention_user_id?: number | null;
    parent?: { user?: { name: string } };
    reply_to_user?: { id: number; name: string } | null;

    // User specific
    user_reaction?: string | null;
    is_liked?: boolean;
    user_interaction?: boolean | null; // Legacy Like/Dislike
    is_author_hearted?: boolean;
}
