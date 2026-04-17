import React, { useEffect, useRef, useState, useMemo, useLayoutEffect } from 'react';
import { customEmojis } from '@/lib/customEmojis';

interface CustomEmojiPickerProps {
    onEmojiClick: (emojiUrl: string) => void;
    onClose: () => void;
}

const ITEM_SIZE = 40; // w-10 is 40px
const ITEMS_PER_ROW = 7;
const CONTAINER_HEIGHT = 240;

export const CustomEmojiPicker: React.FC<CustomEmojiPickerProps> = ({ onEmojiClick, onClose }) => {
    const mainRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'custom' | 'yellow'>('yellow');
    const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
    const [isMeasured, setIsMeasured] = useState(false);

    // Smart positioning logic
    useLayoutEffect(() => {
        if (mainRef.current) {
            const rect = mainRef.current.getBoundingClientRect();
            // If the top of the picker is too close to the top of the viewport
            // (e.g., it would overlap with the header at 60px)
            if (rect.top < 80) {
                setPlacement('bottom');
            } else {
                setPlacement('top');
            }
            setIsMeasured(true);
        }
    }, []);

    // Filter yellow emojis based on Unicode face ranges
    const yellowList = useMemo(() => {
        return customEmojis.filter(e =>
            e.id.startsWith('emoji_u1f6') ||
            e.id.startsWith('emoji_u1f91') ||
            e.id.startsWith('emoji_u1f92') ||
            e.id.startsWith('emoji_u1f97')
        );
    }, []);

    // Selection logic
    const currentList = activeTab === 'custom' ? customEmojis : yellowList;
    const totalRows = Math.ceil(currentList.length / ITEMS_PER_ROW);
    const totalHeight = totalRows * ITEM_SIZE;

    const startRow = Math.max(0, Math.floor(scrollTop / ITEM_SIZE) - 2);
    const endRow = Math.min(totalRows, Math.ceil((scrollTop + CONTAINER_HEIGHT) / ITEM_SIZE) + 2);

    const visibleItems = useMemo(() => {
        const startIndex = startRow * ITEMS_PER_ROW;
        const endIndex = endRow * ITEMS_PER_ROW;
        return currentList.slice(startIndex, endIndex).map((item, idx) => ({
            ...item,
            originalIndex: startIndex + idx
        }));
    }, [startRow, endRow, activeTab, currentList]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    const handleImageLoad = (imgUrl: string) => {
        setLoadedImages(prev => new Set(prev).add(imgUrl));
    };

    return (
        <div
            ref={mainRef}
            onMouseDown={(e) => e.preventDefault()}
            className={`w-[260px] sm:w-[320px] max-w-[85vw] bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-none shadow-xl z-50 overflow-hidden transition-opacity duration-200 ${isMeasured ? 'opacity-100' : 'opacity-0'}`}
        >
            <div className="p-3 border-b border-gray-200 dark:border-[#333] flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        onClick={() => { setActiveTab('custom'); setScrollTop(0); if (containerRef.current) containerRef.current.scrollTop = 0; }}
                        onMouseDown={(e) => e.preventDefault()}
                        className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded-none transition whitespace-nowrap ${activeTab === 'custom' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        كل الرموز
                    </button>
                    <button
                        onClick={() => { setActiveTab('yellow'); setScrollTop(0); if (containerRef.current) containerRef.current.scrollTop = 0; }}
                        onMouseDown={(e) => e.preventDefault()}
                        className={`text-lg sm:text-xl p-1 rounded-none transition hover:bg-gray-100 dark:hover:bg-[#2a2a2a] ${activeTab === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'grayscale'}`}
                        title="الرموز الصفراء"
                    >
                        😊
                    </button>
                </div>
                <button
                    onClick={onClose}
                    onMouseDown={(e) => e.preventDefault()}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-auto p-1"
                >
                    ✕
                </button>
            </div>
            <div
                ref={containerRef}
                className="h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700"
                onScroll={handleScroll}
                style={{ overflowY: 'scroll', WebkitOverflowScrolling: 'touch' }}
            >
                <div style={{ height: totalHeight, position: 'relative' }}>
                    <div
                        className="grid grid-cols-7 gap-1"
                        style={{
                            position: 'absolute',
                            top: startRow * ITEM_SIZE,
                            left: 0,
                            right: 0
                        }}
                    >
                        {visibleItems.map((item) => (
                            <button
                                key={item.originalIndex}
                                onClick={() => onEmojiClick(item.imgUrl)}
                                onMouseDown={(e) => e.preventDefault()}
                                className="w-9 h-9 sm:w-10 sm:h-10 p-1 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-none transition flex items-center justify-center translate-z-0"
                                title={item.id}
                            >
                                <img
                                    src={item.imgUrl}
                                    alt={item.id}
                                    className="w-full h-full object-contain"
                                    loading="eager"
                                    //@ts-ignore
                                    fetchpriority="high"
                                    style={{
                                        opacity: 1,
                                    }}
                                />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
