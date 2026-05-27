import { useEffect, useRef } from 'react';

/**
 * Hook that pushes a history state when a modal opens,
 * then closes the modal when the user presses the device back button.
 */
export function useModalBackButton(isOpen: boolean, onClose: () => void, modalKey: string = 'modal') {
    const onCloseRef = useRef(onClose);
    const popstateTriggeredRef = useRef(false);

    // Always keep the ref updated to the latest onClose callback
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        // Only apply this logic on mobile devices
        if (window.innerWidth >= 768 || !isOpen) {
            popstateTriggeredRef.current = false;
            return;
        }

        // Push a state so the back button has something to pop
        window.history.pushState({ modalKey }, '');
        popstateTriggeredRef.current = false;

        const handlePopState = (e: PopStateEvent) => {
            // Check if the popped state is ours (or rather, we just popped OUR state)
            popstateTriggeredRef.current = true;
            
            // Unfocus any active element to hide keyboard
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            onCloseRef.current();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            // If the effect is cleaning up (modal closing) and it WASN'T triggered by the back button,
            // it means the user closed the modal via the UI. We should manually pop the dummy state
            // to keep the history clean.
            // BUT only pop if we are still on that dummy state (i.e. no navigation occurred).
            if (!popstateTriggeredRef.current) {
                if (window.history.state && window.history.state.modalKey === modalKey) {
                    window.history.back();
                }
            }
        };
    }, [isOpen, modalKey]);
}
