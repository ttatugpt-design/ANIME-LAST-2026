import React from 'react';

export const CommentsSkeleton: React.FC = () => {
    return (
        <div className="space-y-4 animate-pulse">
            {/* Main comment input skeleton */}
            <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-gray-200 dark:bg-[#2a2a2a]"></div>
                <div className="flex-1">
                    <div className="h-12 bg-gray-200 dark:bg-[#2a2a2a] border-b-2 border-gray-300 dark:border-gray-700"></div>
                </div>
            </div>

            {/* Comment items skeleton */}
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-200 dark:bg-[#2a2a2a]"></div>

                    <div className="flex-1 space-y-2">
                        {/* User name and time */}
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-[#2a2a2a]"></div>
                            <div className="h-3 w-16 bg-gray-200 dark:bg-[#2a2a2a]"></div>
                        </div>

                        {/* Comment content */}
                        <div className="space-y-1">
                            <div className="h-4 w-full bg-gray-200 dark:bg-[#2a2a2a]"></div>
                            <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#2a2a2a]"></div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-4 mt-2">
                            <div className="h-3 w-12 bg-gray-200 dark:bg-[#2a2a2a]"></div>
                            <div className="h-3 w-12 bg-gray-200 dark:bg-[#2a2a2a]"></div>
                            <div className="h-3 w-12 bg-gray-200 dark:bg-[#2a2a2a]"></div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Nested comment skeleton (reply) */}
            <div className="mr-4 md:mr-8 border-r-2 border-gray-200 dark:border-[#333] pr-4">
                <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-200 dark:bg-[#2a2a2a]"></div>

                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-20 bg-gray-200 dark:bg-[#2a2a2a]"></div>
                            <div className="h-3 w-14 bg-gray-200 dark:bg-[#2a2a2a]"></div>
                        </div>

                        <div className="space-y-1">
                            <div className="h-3 w-full bg-gray-200 dark:bg-[#2a2a2a]"></div>
                            <div className="h-3 w-2/3 bg-gray-200 dark:bg-[#2a2a2a]"></div>
                        </div>

                        <div className="flex items-center gap-4 mt-2">
                            <div className="h-3 w-10 bg-gray-200 dark:bg-[#2a2a2a]"></div>
                            <div className="h-3 w-10 bg-gray-200 dark:bg-[#2a2a2a]"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
