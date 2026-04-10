import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useTransition, animated } from "@react-spring/web";
import { LinkIcon } from "./Icons";

interface ImportMusicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (url: string) => Promise<boolean>;
}

const ImportMusicDialog: React.FC<ImportMusicDialogProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [importUrl, setImportUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async () => {
    if (!importUrl.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const success = await onImport(importUrl);
      if (success) {
        setImportUrl("");
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setImportUrl("");
    onClose();
  };

  const transitions = useTransition(isOpen, {
    from: { opacity: 0, scale: 0.95, translateY: 10, backdropOpacity: 0 },
    enter: { opacity: 1, scale: 1, translateY: 0, backdropOpacity: 1 },
    leave: { opacity: 0, scale: 0.95, translateY: 10, backdropOpacity: 0 },
    config: { tension: 300, friction: 26 },
  });

  return createPortal(
    <>
      {transitions((styles, item) => item && (
        <animated.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 isolate"
          style={{ pointerEvents: item ? 'auto' : 'none' } as any}
        >
          {/* Backdrop */}
          <animated.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm -z-10"
            style={{ opacity: styles.backdropOpacity }}
            onClick={handleClose}
          />

          {/* Modal */}
          <animated.div
            className="relative w-full max-w-[360px] bg-white/20 backdrop-blur-[80px] saturate-150 border border-white/20 rounded-[28px] overflow-hidden ring-1 ring-white/5"
            style={{
              opacity: styles.opacity,
              transform: styles.translateY.to(y => `translateY(${y}px) scale(${styles.scale.get()})`),
              boxShadow: '0 20px 50px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
            } as any}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Content */}
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
                <LinkIcon className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">
                Import Music
              </h3>
              <p className="text-white/60 text-[15px] mt-2 leading-relaxed px-2">
                Paste a{" "}
                <span className="text-white/90 font-medium">
                  Netease Cloud Music
                </span>{" "}
                song or playlist link to add to queue.
              </p>

              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://music.163.com/..."
                className="w-full mt-5 bg-white/10 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all text-[15px]"
                disabled={isLoading}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleImport();
                  }
                }}
              />
            </div>

            {/* Action Buttons (iOS Style) */}
            <div className="grid grid-cols-2 border-t border-white/10 divide-x divide-white/10 bg-white/5">
              <button
                onClick={handleClose}
                className="py-4 text-[17px] text-white/60 font-medium hover:bg-white/5 transition-colors active:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isLoading}
                className={`py-4 text-[17px] font-semibold transition-colors flex items-center justify-center gap-2 ${isLoading
                  ? "text-white/40 cursor-not-allowed"
                  : "text-blue-400 hover:bg-white/5 active:bg-white/10"
                  }`}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Importing...</span>
                  </>
                ) : (
                  "Import"
                )}
              </button>
            </div>
          </animated.div>
        </animated.div>
      ))}
    </>,
    document.body,
  );
};

export default ImportMusicDialog;
