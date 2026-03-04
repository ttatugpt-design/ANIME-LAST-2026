import { cn } from '@/lib/utils';
import './CrunchyrollSkeleton.css';

interface CrunchyrollSkeletonProps {
    count?: number;
    variant?: 'grid' | 'full-screen' | 'spinner';
    layout?: 'grid' | 'list';
    className?: string;
    isEpisode?: boolean;
    gridClassName?: string;
}

export default function CrunchyrollSkeleton({
    count = 12,
    variant = 'grid',
    layout = 'grid',
    className,
    isEpisode = false,
    gridClassName
}: CrunchyrollSkeletonProps) {
    if (variant === 'full-screen') {
        return <div className={cn("shimmer-wrapper fixed top-16 inset-x-0 bottom-0 z-40 w-screen h-[calc(100vh-4rem)]", className)}></div>;
    }

    if (variant === 'spinner') {
        return <div className={cn("flex justify-center p-4", className)}><div className="animate-spin h-8 w-8 border-4 border-gray-200 dark:border-gray-800 border-t-black dark:border-t-white rounded-full"></div></div>;
    }

    return (
        <div className={cn(
            "crunchyroll-skeleton-grid",
            layout === 'list' && "list",
            gridClassName
        )}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={cn(
                    "crunchyroll-skeleton-card",
                    layout === 'list' && "list",
                    className
                )}>
                    <div className={cn("shimmer-wrapper poster", isEpisode && "episode")}></div>
                    {layout === 'list' ? (
                        <div className="info">
                            <div className="shimmer-wrapper line"></div>
                            <div className="shimmer-wrapper line short"></div>
                        </div>
                    ) : (
                        <>
                            <div className="shimmer-wrapper line"></div>
                            <div className="shimmer-wrapper line short"></div>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}
