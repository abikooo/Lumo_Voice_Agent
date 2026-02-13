import { useState, useEffect, useRef, useCallback } from 'react';

interface VADOptions {
    sensitivity: number; // 0-1, higher is more sensitive
    silenceDuration: number; // ms to wait before easier stop
}

export const useVAD = (onSpeechStart: () => void, onSpeechEnd: () => void, options: VADOptions = { sensitivity: 0.1, silenceDuration: 1500 }) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const rafIdRef = useRef<number | null>(null);

    const startVAD = useCallback(async (stream: MediaStream) => {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.1;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        analyserRef.current = analyser;
        sourceRef.current = source;
        setAudioContext(ctx);

        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
                console.log("VAD: AudioContext resumed");
            } catch (e) {
                console.error("VAD: Failed to resume AudioContext", e);
            }
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Threshold based on sensitivity (inverse: lower sensitivity = higher threshold)
        // simplistic approach: 
        // sensitivity 0.1 -> threshold 20
        // sensitivity 0.9 -> threshold 5
        const threshold = 10 + (1 - options.sensitivity) * 30;

        let speaking = false;

        const checkVolume = () => {
            analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;

            if (average > threshold) {
                if (!speaking) {
                    speaking = true;
                    setIsSpeaking(true);
                    onSpeechStart();
                }
                // Reset silence timer if speaking
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
            } else {
                if (speaking && !silenceTimerRef.current) {
                    silenceTimerRef.current = setTimeout(() => {
                        speaking = false;
                        setIsSpeaking(false);
                        onSpeechEnd();
                        silenceTimerRef.current = null;
                    }, options.silenceDuration);
                }
            }

            rafIdRef.current = requestAnimationFrame(checkVolume);
        };

        checkVolume();
    }, [onSpeechStart, onSpeechEnd, options.sensitivity, options.silenceDuration]);

    const stopVAD = useCallback(() => {
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        if (audioContext && audioContext.state !== 'closed') {
            try {
                audioContext.close();
            } catch (e) {
                console.warn("VAD: Error closing AudioContext", e);
            }
        }
        setAudioContext(null);
        setIsSpeaking(false);
    }, [audioContext]);

    useEffect(() => {
        return () => stopVAD();
    }, [stopVAD]);

    return { isSpeaking, startVAD, stopVAD };
};
