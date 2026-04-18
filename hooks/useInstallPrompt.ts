import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
}

/**
 * Hook to capture the `beforeinstallprompt` event and manage PWA install state.
 */
export function useInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check if user already dismissed
        const dismissed = sessionStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            setIsDismissed(true);
        }

        const handler = (e: Event) => {
            // Prevent the default mini-infobar from appearing on mobile
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Detect if app is already installed
        window.addEventListener('appinstalled', () => {
            setIsInstallable(false);
            setDeferredPrompt(null);
        });

        // Also check if running in standalone mode (already installed)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstallable(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const promptInstall = useCallback(async () => {
        if (!deferredPrompt) return false;

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        // Clear the prompt reference regardless of outcome
        setDeferredPrompt(null);

        if (outcome === 'accepted') {
            setIsInstallable(false);
            return true;
        }
        return false;
    }, [deferredPrompt]);

    const dismiss = useCallback(() => {
        setIsDismissed(true);
        sessionStorage.setItem('pwa-install-dismissed', 'true');
    }, []);

    return {
        isInstallable: isInstallable && !isDismissed,
        promptInstall,
        dismiss,
    };
}
