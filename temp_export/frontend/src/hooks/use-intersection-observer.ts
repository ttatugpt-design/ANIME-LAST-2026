import { useEffect, useRef, useState } from 'react';

export function useIntersectionObserver(options = {}) {
    const elementRef = useRef<HTMLElement | null>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);
    const [hasIntersected, setHasIntersected] = useState(false);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsIntersecting(entry.isIntersecting);
            if (entry.isIntersecting) {
                setHasIntersected(true);
            }
        }, options);

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [options]);

    return { elementRef, isIntersecting, hasIntersected };
}
