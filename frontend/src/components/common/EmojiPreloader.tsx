import { useEffect } from 'react';
import { QUICK_EMOJIS } from '@/components/comments/QuickEmojiRow';
import { getImageUrl } from '@/utils/image-utils';
import { customEmojis } from '@/lib/customEmojis';

const REACTION_URLS = [
    '/uploads/تفاعل البوست/أعجبني.png',
    '/uploads/تفاعل البوست/أحببتة.png',
    '/uploads/تفاعل البوست/أحزنني.gif',
    '/uploads/تفاعل البوست/أغضبني.gif',
    '/uploads/تفاعل البوست/واوو.png',
    '/uploads/تفاعل البوست/اضحكني.png',
    '/uploads/تفاعل البوست/أحززنني جدا.png'
];

/**
 * Ultimate Emoji Preloader (Phase 2)
 * 
 * Loads:
 * 1. Reaction GIFs
 * 2. Quick Emojis (Comments)
 * 3. Most common Yellow Faces (~250 images)
 * 
 * Techniques:
 * - High-priority link preloading
 * - Programmatic GPU decoding (img.decode)
 * - Off-screen persistent DOM caching
 */
export const EmojiPreloader = () => {
    const reactionFullUrls = REACTION_URLS.map(url => getImageUrl(url));
    const quickEmojiFullUrls = QUICK_EMOJIS.map(url => getImageUrl(url));
    
    // Most common faces used in picker
    const yellowEmojiUrls = customEmojis
        .filter(e =>
            e.id.startsWith('emoji_u1f6') ||
            e.id.startsWith('emoji_u1f91') ||
            e.id.startsWith('emoji_u1f92') ||
            e.id.startsWith('emoji_u1f97')
        )
        .slice(0, 250) // Limit to avoid browser overload
        .map(e => getImageUrl(e.imgUrl));

    const allUrls = Array.from(new Set([...reactionFullUrls, ...quickEmojiFullUrls, ...yellowEmojiUrls]));

    useEffect(() => {
        console.group('%c🚀 [EmojiPreloader] Monitoring Background Loading', 'color: #3b82f6; font-weight: bold; font-size: 12px;');
        console.log(`- Reactions: ${reactionFullUrls.length}`);
        console.log(`- Quick Emojis: ${quickEmojiFullUrls.length}`);
        console.log(`- Yellow Faces: ${yellowEmojiUrls.length}`);
        console.log(`- Total unique assets: ${allUrls.length}`);
        
        // 1. Initial High-Priority Head Preload (First 10 images)
        // These will show up in "Network" tab immediately under "All" or "Img"
        allUrls.slice(0, 10).forEach((url, i) => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = url;
            //@ts-ignore
            link.fetchpriority = 'high';
            document.head.appendChild(link);
            if (i === 0) console.log(`[Sample URL] ${url}`);
        });

        // 2. Staggered Background Decoding
        const processBatch = (startIndex: number) => {
            const batchSize = 10;
            const batch = allUrls.slice(startIndex, startIndex + batchSize);
            
            if (batch.length === 0) {
                console.log('%c✅ [EmojiPreloader] All assets processed and cached.', 'color: #10b981; font-weight: bold;');
                return;
            }

            batch.forEach(url => {
                const img = new Image();
                img.src = url;
                img.decode?.().catch(() => {});
            });

            // Schedule next batch
            setTimeout(() => processBatch(startIndex + batchSize), 400); 
        };

        const timer = setTimeout(() => {
            console.log('[EmojiPreloader] Loading batches...');
            processBatch(0);
        }, 1500);

        console.groupEnd();
        return () => clearTimeout(timer);
    }, []);

    return (
        <div 
            id="emoji-v-preloader"
            aria-hidden="true"
            style={{
                position: 'fixed',
                top: 0,
                left: '-10px',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex: -9999,
                opacity: 0.05
            }}
        >
            {allUrls.map((url, idx) => (
                <img 
                    key={idx} 
                    src={url} 
                    alt="" 
                    loading="eager" 
                    //@ts-ignore
                    fetchpriority={idx < 40 ? "high" : "low"}
                />
            ))}
        </div>
    );
};
