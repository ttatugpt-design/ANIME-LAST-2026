import { cn } from "@/lib/utils";

export default function CentralSpinner({ className, size = "large", color = "#FF3D00" }: { className?: string, size?: "small" | "medium" | "large", color?: string }) {
    // Exact sizes based on AnimeDetailsPage loader
    const sizes = {
        small: {
            outer: "w-8 h-8 border-2",
            after: "w-6 h-6 border-2",
            before: "w-4 h-4 border-2"
        },
        medium: {
            outer: "w-12 h-12 border-[3px]",
            after: "w-9 h-9 border-[3px]",
            before: "w-6 h-6 border-[3px]"
        },
        large: {
            outer: "w-16 h-16 border-4",
            after: "w-12 h-12 border-4",
            before: "w-8 h-8 border-4"
        }
    };

    const currentSize = sizes[size];

    return (
        <div className={cn("flex items-center justify-center", size === "large" ? "min-h-[70vh] w-full" : "", className)}>
            <div className="flex items-center justify-center relative">
                <style>{`
                    @keyframes ep-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
                    @keyframes ep-spinBack { 0%{transform:rotate(0deg)} 100%{transform:rotate(-360deg)} }
                `}</style>
                
                {/* Triple Ring Spinner - Correctly Scaled without CSS transform:scale */}
                <div className={cn(
                    "rounded-full inline-block relative border-solid border-[#FF3D00]/20 border-r-transparent border-b-transparent animate-[ep-spin_1s_linear_infinite] box-border",
                    currentSize.outer
                )}>
                    <div className={cn(
                        "absolute inset-0 m-auto border-solid border-transparent rounded-full animate-[ep-spinBack_0.6s_linear_infinite] box-border",
                        currentSize.after
                    )} style={{ borderBottomColor: color, borderLeftColor: color }} />
                    <div className={cn(
                        "absolute inset-0 m-auto border-solid border-[#FF3D00]/10 border-r-transparent border-b-transparent rounded-full animate-[ep-spin_1.2s_linear_infinite] box-border",
                        currentSize.before
                    )} />
                </div>
            </div>
        </div>
    );
}
