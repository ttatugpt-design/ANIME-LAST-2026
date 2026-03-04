export default function HistorySkeleton({ count = 10 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-[#1a1a1a] animate-pulse">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-[#333]"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-[#333] rounded" style={{ width: `${70 + Math.random() * 20}%` }}></div>
                        <div className="h-3 w-24 bg-gray-200 dark:bg-[#333] rounded"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}
