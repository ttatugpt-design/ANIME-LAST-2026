import React from 'react';
import { cn } from '@/lib/utils';

// A single shimmering skeleton item that mirrors the exact CommentItem layout
const SkeletonComment: React.FC<{
    isReply?: boolean;
    hasReply?: boolean;
    lines?: number;
}> = ({ isReply = false, hasReply = false, lines = 2 }) => {
    return (
        <div className={cn('relative', isReply && 'ml-0 md:ml-10')}>
            {/* Thread lines for replies */}
            {isReply && (
                <>
                    {hasReply && (
                        <div className="absolute top-0 bottom-0 -left-5 md:-left-6 w-0.5 bg-gray-200 dark:bg-[#333]" />
                    )}
                    <div className="absolute top-0 -left-5 md:-left-6 w-5 md:w-6 h-5 border-l-2 border-b-2 border-gray-200 dark:border-[#333] rounded-bl-2xl" />
                </>
            )}

            <div className="flex gap-2 pb-3 px-2 md:px-0">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <div className={cn(
                        'rounded-full bg-gray-200 dark:bg-[#2a2a2a] ring-2 ring-gray-100 dark:ring-white/10',
                        isReply ? 'w-8 h-8 md:w-9 md:h-9' : 'w-10 h-10 md:w-12 md:h-12'
                    )} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                    {/* Header row: name + time */}
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-3.5 w-24 bg-gray-200 dark:bg-[#2a2a2a] rounded-full" />
                        <div className="h-3 w-16 bg-gray-200 dark:bg-[#2a2a2a] rounded-full opacity-60" />
                    </div>

                    {/* Comment text lines */}
                    <div className="space-y-1.5">
                        <div className="h-4 w-full bg-gray-200 dark:bg-[#2a2a2a] rounded-full" />
                        {lines >= 2 && (
                            <div className="h-4 w-4/5 bg-gray-200 dark:bg-[#2a2a2a] rounded-full" />
                        )}
                        {lines >= 3 && (
                            <div className="h-4 w-3/5 bg-gray-200 dark:bg-[#2a2a2a] rounded-full" />
                        )}
                    </div>

                    {/* Action bar: Like · Reply · Time */}
                    <div className="flex items-center gap-4 mt-2.5">
                        {/* Reaction mini icons */}
                        <div className="flex items-center gap-1">
                            <div className="h-4 w-4 bg-gray-200 dark:bg-[#2a2a2a] rounded-full" />
                            <div className="h-3 w-5 bg-gray-200 dark:bg-[#2a2a2a] rounded-full" />
                        </div>
                        <div className="h-3 w-3 bg-gray-200 dark:bg-[#2a2a2a] rounded-full opacity-50" />
                        <div className="h-3 w-3 bg-gray-200 dark:bg-[#2a2a2a] rounded-full opacity-50" />
                        <div className="h-3 w-12 bg-gray-200 dark:bg-[#2a2a2a] rounded-full" />
                        <div className="h-3 w-8 bg-gray-200 dark:bg-[#2a2a2a] rounded-full opacity-50" />
                    </div>
                </div>

                {/* Options menu dot */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-[#222] self-start mt-1" />
            </div>
        </div>
    );
};

// Animated shimmer overlay using CSS animation
const Shimmer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="relative overflow-hidden">
        {children}
        <div
            className="absolute inset-0 pointer-events-none"
            style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                animation: 'shimmer 1.6s infinite',
                backgroundSize: '200% 100%',
            }}
        />
    </div>
);

export const CommentsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
    // Vary line counts per comment for realism
    const lineCounts = [2, 3, 1, 2, 2, 3, 1, 2];

    return (
        <>
            <style>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>

            <div className="space-y-0 animate-pulse">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                        <Shimmer>
                            <SkeletonComment
                                lines={lineCounts[i % lineCounts.length]}
                                hasReply={false}
                            />
                        </Shimmer>

                        {/* Occasionally show a nested reply skeleton */}
                        {i % 3 === 1 && (
                            <div className="relative ml-10 md:ml-14 mb-3">
                                {/* Vertical thread connector */}
                                <div className="absolute top-0 -left-5 md:-left-6 w-5 md:w-6 h-5 border-l-2 border-b-2 border-gray-200 dark:border-[#333] rounded-bl-2xl" />
                                <Shimmer>
                                    <div className="flex gap-2 pr-2">
                                        {/* Reply avatar — smaller */}
                                        <div className="flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-200 dark:bg-[#2a2a2a] ring-2 ring-gray-100 dark:ring-white/10" />
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="h-3 w-20 bg-gray-200 dark:bg-[#2a2a2a] rounded-full" />
                                                <div className="h-2.5 w-14 bg-gray-200 dark:bg-[#2a2a2a] rounded-full opacity-60" />
                                            </div>
                                            <div className="h-3.5 w-3/4 bg-gray-200 dark:bg-[#2a2a2a] rounded-full" />
                                            <div className="flex items-center gap-3 mt-2">
                                                <div className="h-3 w-8 bg-gray-200 dark:bg-[#2a2a2a] rounded-full" />
                                                <div className="h-3 w-8 bg-gray-200 dark:bg-[#2a2a2a] rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                </Shimmer>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
};
