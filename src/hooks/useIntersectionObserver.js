import { useState, useEffect, useRef } from 'react';

// Function to apply the fade in effect when site is loaded first.
export const useIntersectionObserver = (options) => {
    const [isVisible, setIsVisible] = useState(false);
    const elementRef = useRef(null);

    useEffect(() => {
        const element = elementRef.current;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entry.target);
            }
        }, options);

        if (element) {
            observer.observe(element);
        }

        return () => {
            observer.disconnect();
        };
    }, [elementRef, options]);

    return [elementRef, isVisible];
};
