import React, { useState, useEffect } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { usePlayerContext } from '../context/PlayerContext';

/**
 * A sleek banner that slides in from the bottom when the app is installable.
 * Matches the Aura Music design language — glassmorphism + smooth animations.
 */
const InstallPrompt: React.FC = () => {
    const { isInstallable, promptInstall, dismiss } = useInstallPrompt();
    const { theme } = usePlayerContext();
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    const isFluid = theme === 'fluid';

    useEffect(() => {
        if (isInstallable) {
            // Delay appearance for a smoother first-visit experience
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, [isInstallable]);

    if (!isInstallable && !isVisible) return null;

    const handleInstall = async () => {
        const accepted = await promptInstall();
        if (accepted) {
            handleClose();
        }
    };

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsLeaving(false);
            dismiss();
        }, 400);
    };

    if (!isVisible) return null;

    return (
        <div
            className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998]
        flex items-center gap-4 px-6 py-4
        border shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${isFluid
                    ? "bg-white/20 backdrop-blur-[100px] saturate-150 rounded-[32px] border-white/20"
                    : "bg-zinc-900 rounded-2xl border-white/10"
                }
        ${isLeaving
                    ? 'opacity-0 translate-y-4 scale-95'
                    : 'opacity-100 translate-y-0 scale-100'
                }
        max-w-[480px] w-[calc(100%-2rem)]
      `}
            style={{
                animation: isLeaving ? undefined : 'installSlideUp 0.6s cubic-bezier(0.32, 0.72, 0, 1) forwards',
                boxShadow: isFluid ? '0 20px 50px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none'
            }}
        >
            {/* App Icon */}
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" viewBox="0 0 512 512" fill="none">
                    <rect x="146" y="190" width="60" height="132" rx="30" fill="currentColor" />
                    <rect x="226" y="120" width="60" height="272" rx="30" fill="currentColor" />
                    <rect x="306" y="210" width="60" height="96" rx="30" fill="currentColor" />
                </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-semibold leading-tight ${isFluid ? "text-white" : "text-white"}`}>
                    安装 Aura Music
                </p>
                <p className={`text-[13px] leading-tight mt-0.5 ${isFluid ? "text-white/60" : "text-white/60"}`}>
                    添加到桌面，获得更好的体验
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={handleClose}
                    className={`px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors duration-200 ${isFluid ? "text-white/50 hover:text-white" : "text-white/50 hover:text-white"
                        }`}
                >
                    暂不
                </button>
                <button
                    onClick={handleInstall}
                    className="px-4 py-1.5 text-[13px] font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 active:scale-95 transition-all duration-200 shadow-lg shadow-purple-500/25"
                >
                    安装
                </button>
            </div>

            {/* Inject keyframe animation */}
            <style>{`
        @keyframes installSlideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(24px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
      `}</style>
        </div>
    );
};

export default InstallPrompt;
