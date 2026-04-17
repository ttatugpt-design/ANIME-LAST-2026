import React, { useRef, useState, useEffect } from 'react';

interface QuickEmojiRowProps {
    onEmojiClick: (emojiUrl: string) => void;
}

export const QUICK_EMOJIS = [
    '/custom-emojis/emoji_u1f601.png',
    '/custom-emojis/emoji_u1f602.png',
    '/custom-emojis/emoji_u1f60d.png',
    '/custom-emojis/emoji_u1f60c.png',
    '/custom-emojis/emoji_u1f606.png',
    '/custom-emojis/emoji_u1f605.png',
    '/custom-emojis/emoji_u1f614.png',
    '/custom-emojis/emoji_u1f60f.png',
    '/custom-emojis/emoji_u1f621.png',
    '/custom-emojis/emoji_u1f622.png',
    '/custom-emojis/emoji_u1f61e.png',
    '/custom-emojis/emoji_u1f62d.png',
    '/custom-emojis/emoji_u1f63b.png',
    '/custom-emojis/emoji_u1f64a.png',
    '/custom-emojis/emoji_u1f645_200d_2640.png',
    '/custom-emojis/emoji_u1f646_200d_2640.png',
    '/custom-emojis/emoji_u1f64b_200d_2642.png',
    '/custom-emojis/unnamed.png',
    '/custom-emojis/unnamed(1).jpg',
    ...Array.from({ length: 28 }, (_, i) => `/custom-emojis/unnamed(${i + 2}).png`)
];

export const QuickEmojiRow: React.FC<QuickEmojiRowProps> = ({ onEmojiClick }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [dragDistance, setDragDistance] = useState(0);
    const clickTargetRef = useRef<HTMLElement | null>(null);
    const lastClickTime = useRef<number>(0);

    const onPointerDown = (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        
        const ele = scrollRef.current;
        if (!ele) return;

        setIsDragging(true);
        setStartX(e.pageX - ele.offsetLeft);
        setScrollLeft(ele.scrollLeft);
        setDragDistance(0);
        clickTargetRef.current = e.target as HTMLElement;
        ele.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse' || !isDragging || !scrollRef.current) return;

        const ele = scrollRef.current;
        const x = e.pageX - ele.offsetLeft;
        const walk = (x - startX) * 4.0; // Faster and smoother
        // Inverted: dragging right (positive walk) now increases scrollLeft (reveals more content from the right)
        ele.scrollLeft = scrollLeft + walk;
        setDragDistance(Math.abs(x - startX));
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse' || !isDragging) return;
        setIsDragging(false);
        scrollRef.current?.releasePointerCapture(e.pointerId);

        if (dragDistance <= 10 && clickTargetRef.current) {
            const button = clickTargetRef.current.closest('button');
            const url = button?.getAttribute('data-url');
            if (url) {
                handleEmojiClick(url);
            }
        }
        clickTargetRef.current = null;
    };

    const handleEmojiClick = (url: string) => {
        // Only trigger click if the drag distance was minimal (less than 10px)
        if (dragDistance > 10) return;
        
        // Prevent double insertion - reduced from 300ms to 50ms for very fast response
        const now = Date.now();
        if (now - lastClickTime.current < 50) return;
        lastClickTime.current = now;

        onEmojiClick(url);
    };

    // Attach native touch events to prevent Radix Sheet from swallowing horizontal scroll
    useEffect(() => {
        const ele = scrollRef.current;
        if (!ele) return;

        let startTouchX = 0;
        let startTouchY = 0;
        let isHorizontal: boolean | null = null;

        const onTouchStart = (e: TouchEvent) => {
            startTouchX = e.touches[0].clientX;
            startTouchY = e.touches[0].clientY;
            isHorizontal = null;
        };

        const onTouchMove = (e: TouchEvent) => {
            if (isHorizontal === null) {
                const dx = Math.abs(e.touches[0].clientX - startTouchX);
                const dy = Math.abs(e.touches[0].clientY - startTouchY);
                isHorizontal = dx > dy;
            }
            if (isHorizontal) {
                e.stopPropagation(); // prevent Sheet from closing; let native scroll work
            }
        };

        ele.addEventListener('touchstart', onTouchStart, { passive: true });
        ele.addEventListener('touchmove', onTouchMove, { passive: true });
        return () => {
            ele.removeEventListener('touchstart', onTouchStart);
            ele.removeEventListener('touchmove', onTouchMove);
        };
    }, []);

    return (
        <div className="relative overflow-hidden w-full select-none h-12 md:h-14 flex items-center" dir="ltr">
            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}} />
            <div
                ref={scrollRef}
                className="hide-scrollbar flex items-center gap-2 overflow-x-auto py-2 px-1 cursor-grab active:cursor-grabbing touch-pan-x overscroll-x-contain w-full"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                {QUICK_EMOJIS.map((url, idx) => (
                    <button
                        key={idx}
                        type="button"
                        data-emoji="true"
                        data-url={url}
                        onPointerDown={(e) => {
                            // Stop focus shift but allow wrapper to see event to reset dragDistance!
                            if (e.pointerType === 'mouse') {
                                e.preventDefault();
                            }
                        }}
                        onMouseDown={(e) => {
                            // On mobile, this preserves focus without breaking touch panning
                            e.preventDefault();
                        }}
                        onClick={(e) => {
                            // Actually insert the emoji exactly once for all devices
                            e.preventDefault();
                            handleEmojiClick(url);
                        }}
                        className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all active:scale-90 flex items-center justify-center p-1.5"
                    >
                        <img
                            src={url}
                            alt=""
                            className="w-full h-full object-contain pointer-events-none"
                            loading="eager"
                            //@ts-ignore
                            fetchpriority="high"
                            draggable="false"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
};
