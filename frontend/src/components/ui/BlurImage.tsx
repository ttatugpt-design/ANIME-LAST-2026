import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BlurImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    placeholder?: string;
    alt: string;
    className?: string; // Wrapper class
    imageClassName?: string; // Image class
}

const BlurImage = ({
    src,
    placeholder,
    alt,
    className,
    imageClassName,
    ...props
}: BlurImageProps) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        // Reset state if src changes
        setIsLoaded(false);
        setError(false);
    }, [src]);

    // If no placeholder, just behave like normal img (but with fade)
    // If placeholder, show it until main loads
    const showPlaceholder = placeholder && !isLoaded && !error;

    return (
        <div className={cn("relative overflow-hidden bg-gray-200 dark:bg-gray-800", className)}>
            {/* Placeholder Image (The "Confusion" Image) */}
            {placeholder && (
                <img
                    src={placeholder}
                    alt={alt}
                    className={cn(
                        "absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out",
                        // If main loaded, fade out placeholder to reveal main (or keep it behind, doesn't matter much if main is opaque)
                        // Actually better to keep it visible behind to avoid white flash if main has transparency
                        // But usually main is opaque. Let's keep it simply "visible" effectively.
                        imageClassName
                    )}
                    aria-hidden="true"
                />
            )}

            {/* Main Image */}
            <img
                src={src}
                alt={alt}
                onLoad={() => setIsLoaded(true)}
                onError={() => setError(true)}
                className={cn(
                    "relative w-full h-full object-cover transition-opacity duration-700 ease-in-out",
                    isLoaded ? "opacity-100" : "opacity-0",
                    imageClassName
                )}
                {...props}
            />
        </div>
    );
};

export default BlurImage;
