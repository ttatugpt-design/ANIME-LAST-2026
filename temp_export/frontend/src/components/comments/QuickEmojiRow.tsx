import React, { useRef } from 'react';

interface QuickEmojiRowProps {
    onEmojiClick: (emojiUrl: string) => void;
}

// Generate a limited pool of 30 emojis as requested
const QUICK_EMOJIS = [
    '/custom-emojis/unnamed.png',
    '/custom-emojis/unnamed(1).jpg',
    ...Array.from({ length: 28 }, (_, i) => `/custom-emojis/unnamed(${i + 2}).png`)
];

export const QuickEmojiRow: React.FC<QuickEmojiRowProps> = ({ onEmojiClick }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div className="relative group/emoji-row">
            <style dangerouslySetInnerHTML={{
                __html: `
                .quick-emoji-scroll::-webkit-scrollbar {
                    height: 3px;
                }
                .quick-emoji-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .quick-emoji-scroll::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.3);
                    border-radius: 10px;
                }
                .quick-emoji-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(156, 163, 175, 0.6);
                }
                .dark .quick-emoji-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                }
                .dark .quick-emoji-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}} />
            <div
                ref={scrollRef}
                className="quick-emoji-scroll flex items-center gap-1.5 overflow-x-auto py-1 px-1 select-none h-11 sm:h-[49px] pb-2 scroll-smooth"
            >
                {QUICK_EMOJIS.map((url, idx) => (
                    <button
                        key={idx}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onEmojiClick(url)}
                        className="flex-shrink-0 basis-[8.4%] sm:basis-[6.2%] max-w-[26px] sm:max-w-[31px] aspect-square hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-md transition-all active:scale-90"
                    >
                        <img
                            src={url}
                            alt={`emoji-${idx}`}
                            className="w-full h-full object-contain p-1 pointer-events-none"
                            loading="lazy"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
};
