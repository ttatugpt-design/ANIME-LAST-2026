import { cn } from "@/lib/utils";

export default function CentralSpinner({ className }: { className?: string }) {
    return (
        <div className={cn("flex-1 flex items-center justify-center min-h-[70vh] w-full", className)}>
            <div className="relative w-16 h-16 md:w-20 md:h-20">
                <div className="absolute inset-0 border-4 border-gray-100 dark:border-neutral-900 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>
        </div>
    );
}
