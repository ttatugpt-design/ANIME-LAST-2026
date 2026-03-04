import './EpisodeSkeleton.css';

interface EpisodeSkeletonProps {
    count?: number;
    className?: string; // Allow custom grid class
}

export default function EpisodeSkeleton({ count = 12, className }: EpisodeSkeletonProps) {
    return (
        <div className={className || "episode-skeleton-grid"}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="episode-skeleton-card">
                    <div className="shimmer-wrapper-ep thumbnail"></div>
                    <div className="shimmer-wrapper-ep line"></div>
                    <div className="shimmer-wrapper-ep line short"></div>
                </div>
            ))}
        </div>
    );
}
