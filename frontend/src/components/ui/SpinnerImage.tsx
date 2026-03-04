import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SpinnerImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string; // src is optional in HTML attributes but we expect it
    alt?: string;
    className?: string; // Wrapper class for the container
    imageClassName?: string; // Class for the img element itself
    containerClassName?: string; // Optional specific class for the container
    spinnerClassName?: string; // Class for the spinner element
}

const SpinnerImage = ({
    src,
    alt,
    className,
    imageClassName,
    containerClassName,
    spinnerClassName,
    ...props
}: SpinnerImageProps) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        // If no src, treat as error or loaded-empty to remove spinner
        if (!src) {
            setError(true);
            setIsLoaded(false);
            return;
        }

        setIsLoaded(false);
        setError(false);

        // Check if image is already loaded (e.g. from cache)
        if (imgRef.current && imgRef.current.complete) {
            if (imgRef.current.naturalWidth > 0) {
                setIsLoaded(true);
            } else {
                // If complete but no width, it might be an error or empty
                // But we'll wait for onError to fire if it's a real load failure
            }
        }
    }, [src]);

    return (
        <div className={cn("relative overflow-hidden bg-gray-200 dark:bg-[#2a2a2a]", className, containerClassName)}>
            {/* Spinner */}
            {!isLoaded && !error && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className={cn("w-8 h-8 border-4 border-gray-100 dark:border-gray-800 border-t-black dark:border-t-white rounded-full animate-spin", spinnerClassName)}></div>
                </div>
            )}

            {/* Error Fallback (Optional - currently just empty box, or we could show an icon) */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center z-0 text-gray-400">
                    {/* Optional: <ImageIcon className="w-6 h-6" /> */}
                </div>
            )}

            {/* Image */}
            {src && (
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt || ""}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setError(true)}
                    className={cn(
                        "w-full h-full object-cover transition-opacity duration-500",
                        isLoaded ? "opacity-100" : "opacity-0",
                        imageClassName
                    )}
                    {...props}
                />
            )}
        </div>
    );
};

export default SpinnerImage;
