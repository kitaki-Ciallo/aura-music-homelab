import React, { useEffect, useRef, useCallback } from 'react';

interface VisualizerProps {
    audioRef: React.RefObject<HTMLAudioElement>;
    isPlaying: boolean;
}

// Global singletons per audio element - survive component remounts
let globalContext: AudioContext | null = null;
let globalSource: MediaElementAudioSourceNode | null = null;
let globalAnalyser: AnalyserNode | null = null;
let connectedAudioEl: HTMLAudioElement | null = null;

function getOrCreateAnalyser(audioEl: HTMLAudioElement): AnalyserNode | null {
    // If already set up for this element, just return existing analyser
    if (globalAnalyser && connectedAudioEl === audioEl) {
        return globalAnalyser;
    }

    try {
        if (!globalContext) {
            globalContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (!globalAnalyser) {
            globalAnalyser = globalContext.createAnalyser();
            globalAnalyser.fftSize = 256;
            globalAnalyser.smoothingTimeConstant = 0.5;
        }

        if (connectedAudioEl !== audioEl) {
            // Need to create source for this audio element
            try {
                globalSource = globalContext.createMediaElementSource(audioEl);
                globalSource.connect(globalContext.destination);
                globalSource.connect(globalAnalyser);
                connectedAudioEl = audioEl;
            } catch (e: any) {
                // If the MediaElement was already connected (e.g. after HMR),
                // we can't create a new source. Try to use AnalyserNode via destination.
                // Fallback: create a completely new AudioContext
                if (e.name === 'InvalidStateError') {
                    console.warn("Visualizer: Audio element already connected, creating fresh context");
                    globalContext.close().catch(() => { });
                    globalContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    globalAnalyser = globalContext.createAnalyser();
                    globalAnalyser.fftSize = 256;
                    globalAnalyser.smoothingTimeConstant = 0.5;

                    globalSource = globalContext.createMediaElementSource(audioEl);
                    globalSource.connect(globalContext.destination);
                    globalSource.connect(globalAnalyser);
                    connectedAudioEl = audioEl;
                } else {
                    throw e;
                }
            }
        }

        return globalAnalyser;
    } catch (e) {
        console.error("Visualizer: Failed to create analyser", e);
        return null;
    }
}

const Visualizer: React.FC<VisualizerProps> = ({ audioRef, isPlaying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const barsRef = useRef<number[]>([]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const audioEl = audioRef.current;
        if (!audioEl) return;

        const analyser = getOrCreateAnalyser(audioEl);
        if (!analyser) return;

        // Resume context on first user interaction
        if (globalContext && globalContext.state === 'suspended') {
            globalContext.resume().catch(() => { });
        }

        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Set canvas size for HiDPI
        if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
        }

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        canvasCtx.save();
        canvasCtx.scale(dpr, dpr);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barCount = 128;
        if (barsRef.current.length !== barCount) {
            barsRef.current = new Array(barCount).fill(0);
        }

        const step = Math.max(1, Math.floor(bufferLength / barCount));
        const barWidth = Math.max(1, width / barCount - 1);
        const barGap = Math.max(0.5, width / barCount - barWidth);

        canvasCtx.fillStyle = '#ffffff';

        for (let i = 0; i < barCount; i++) {
            // Take max value in this frequency bin range
            let maxVal = 0;
            for (let j = 0; j < step; j++) {
                const idx = i * step + j;
                if (idx < bufferLength) {
                    maxVal = Math.max(maxVal, dataArray[idx] / 255);
                }
            }

            // Smooth temporal transition
            barsRef.current[i] += (maxVal - barsRef.current[i]) * 0.15;

            const amplitude = Math.min(barsRef.current[i], 1);
            const barHeight = Math.max(2, amplitude * height);
            const x = i * (barWidth + barGap);
            const y = height - barHeight;

            canvasCtx.beginPath();
            canvasCtx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
            canvasCtx.fill();
        }

        canvasCtx.restore();

        animFrameRef.current = requestAnimationFrame(draw);
    }, [audioRef]);

    useEffect(() => {
        animFrameRef.current = requestAnimationFrame(draw);
        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [draw]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full max-w-[320px] h-8"
        />
    );
};

export default Visualizer;
