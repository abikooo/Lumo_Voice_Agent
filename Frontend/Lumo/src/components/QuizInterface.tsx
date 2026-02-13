
import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, ArrowLeft, Zap, ZapOff } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { API_URL } from '../api/client';
import { useVAD } from '../hooks/useVAD';

interface QuizInterfaceProps {
    sessionId: number;
    onExit: () => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const getAuthToken = () => localStorage.getItem('token');
const getAuthHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const QuizInterface = ({ sessionId, onExit }: QuizInterfaceProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [status, setStatus] = useState<string>("Hazırlanıyor...");
    const [permissionDenied, setPermissionDenied] = useState(false);

    const [handsFreeMode, setHandsFreeMode] = useState(true); // Default to Auto-On
    const [stream, setStream] = useState<MediaStream | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    // VAD Handling
    const handleSpeechStart = useCallback(() => {
        if (!isRecording && !isProcessing && !isPlaying && handsFreeMode) {
            console.log("VAD: Speech started, checking if we should record...");
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
                startRecordingVideoFree();
            }
        }
    }, [isRecording, isProcessing, isPlaying, handsFreeMode, stream]);

    const handleSpeechEnd = useCallback(() => {
        if (isRecording && handsFreeMode) {
            console.log("VAD: Speech ended, stopping recording...");
            stopRecording();
        }
    }, [isRecording, handsFreeMode, stream]);

    const { startVAD, stopVAD, isSpeaking } = useVAD(handleSpeechStart, handleSpeechEnd);

    // Auto-start HandsFree on mount
    useEffect(() => {
        const initHandsFree = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ audio: true });
                setStream(s);
                startVAD(s);
                // setHandsFreeMode(true); // Already true
                setStatus("Otomatik mod aktif (Dinleniyor...)");
                setPermissionDenied(false);
            } catch (e) {
                console.error("Failed to auto-start VAD", e);
                setHandsFreeMode(false);
                setPermissionDenied(true);
                setStatus("Mikrofon hatası");
            }
        };

        if (handsFreeMode && !stream) {
            initHandsFree();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    // Toggle Hands-Free
    const toggleHandsFree = async () => {
        if (!handsFreeMode) {
            // Enable
            try {
                const s = await navigator.mediaDevices.getUserMedia({ audio: true });
                setStream(s);
                startVAD(s);
                setHandsFreeMode(true);
                setStatus("Otomatik mod aktif (Dinleniyor...)");
            } catch (e) {
                console.error("Failed to start VAD stream", e);
                alert("Mikrofon izni gerekli.");
            }
        } else {
            // Disable
            stopVAD();
            if (stream) stream.getTracks().forEach(t => t.stop());
            setStream(null);
            setHandsFreeMode(false);
            setStatus("Hazır (Manuel Mod)");
        }
    };

    // Cleanup on exit
    useEffect(() => {
        return () => {
            stopVAD();
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [stream, stopVAD]);

    // Initial greeting trigger
    useEffect(() => {
        const sayHello = async () => {
            // Small delay to ensure audio context is ready
            await new Promise(r => setTimeout(r, 1000));

            // Add initial welcome message to UI
            setMessages([{ role: 'assistant', content: "Merhaba! Pratik yapmaya hazır mısın?" }]);

            // Play audio
            await playResponse("Merhaba! Pratik yapmaya hazır mısın?");
        };

        sayHello();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Modified Start/Stop logic to handle reuse of stream in HandsFree mode
    const startRecordingVideoFree = () => {
        // ... (Logic to start media recorder using existing 'stream')
        if (!stream || mediaRecorderRef.current?.state === 'recording') return;

        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            await processAudio(audioBlob);
            // Do NOT stop stream tracks if in HandsFree mode
            if (!handsFreeMode) {
                stream.getTracks().forEach(t => t.stop());
            }
        };

        mediaRecorder.start();
        setIsRecording(true);
        setStatus("Kaydediliyor (Konuşun)...");
    };

    const startRecording = async () => {
        if (handsFreeMode) {
            // If hands free is on, user might force start, but VAD handles it mostly.
            // If forced click:
            if (stream) startRecordingVideoFree();
            return;
        }

        setStatus("İzin isteniyor...");
        setPermissionDenied(false);
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Tarayıcınız ses kaydını desteklemiyor.");
            }

            const s = await navigator.mediaDevices.getUserMedia({ audio: true });

            // If manual mode, we create new stream every time usually, or reuse. 
            // Let's standard usage:
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
            const mediaRecorder = new MediaRecorder(s, { mimeType });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                await processAudio(audioBlob);
                s.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setStatus("Dinleniyor...");
        } catch (error) {
            console.error("Microphone error:", error);
            const err = error as any;
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionDenied(true);
                setStatus("Erişim reddedildi");
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                alert(`Mikrofon hatası: ${errorMessage}`);
                setStatus("Hata");
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setStatus("İşleniyor...");
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append("audio", audioBlob, "quiz_audio.webm");
            formData.append("session_id", sessionId.toString());

            // 1. Send Audio to STT + LLM
            const askResponse = await fetch(`${API_URL}/voice/ask`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(), // Authorization header
                },
                body: formData
            });

            if (!askResponse.ok) throw new Error("Voice API request failed");

            const result = await askResponse.json();

            // Add messages to UI
            setMessages(prev => [
                ...prev,
                { role: 'user', content: result.user_transcript },
                { role: 'assistant', content: result.ai_response }
            ]);

            // 2. Get Audio for AI Response
            if (result.ai_response) {
                setStatus("Seslendiriliyor...");
                await playResponse(result.ai_response);
            } else {
                setStatus(handsFreeMode ? "Otomatik mod aktif" : "Hazır");
            }

        } catch (error) {
            console.error("Processing failed:", error);
            setStatus("Hata oluştu");
        } finally {
            setIsProcessing(false);
        }
    };

    const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);

    const playResponse = async (text: string) => {
        try {
            if (handsFreeMode) {
                stopVAD();
            }

            console.log("AUDIO DEBUG: Fetching speech stream for:", text.substring(0, 20) + "...");

            // Using speak-stream endpoint as requested
            const ttsResponse = await fetch(`${API_URL}/voice/speak-stream`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text, response_format: 'wav', voice_id: 'ali', speed: 0.9 })
            });

            if (!ttsResponse.ok) throw new Error(`TTS stream failed: ${ttsResponse.status}`);

            // Get blob from stream (robust & compatible)
            const audioBlob = await ttsResponse.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            setLastAudioUrl(audioUrl);

            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                audioPlayerRef.current = null;
            }

            const audio = new Audio(audioUrl);
            audioPlayerRef.current = audio;

            audio.onended = () => {
                console.log("AUDIO DEBUG: Playback ended");
                setIsPlaying(false);
                setStatus(handsFreeMode ? "Otomatik mod aktif (Dinleniyor...)" : "Hazır");
                URL.revokeObjectURL(audioUrl);
                if (handsFreeMode && stream) startVAD(stream);
            };

            audio.onerror = (e) => {
                console.error("AUDIO DEBUG: Playback error:", e);
                setIsPlaying(false);
                setStatus("Ses hatası");
            };

            setIsPlaying(true);
            await audio.play();

        } catch (error) {
            console.error("AUDIO DEBUG: Streaming failed:", error);
            setStatus("Ses çalma hatası");
            setIsPlaying(false);
            if (handsFreeMode && stream) startVAD(stream);
        }
    };

    // Automatic playback disabled by user request
    // User must click "Replay" to listen.
    // try {
    //     await audio.play();
    //     console.log("AUDIO DEBUG: Play command success");
    // } catch (playError) {
    //     console.error("AUDIO DEBUG: Play command failed (Autoplay blocked?):", playError);
    //     setIsPlaying(false);
    //     setStatus("Otomatik oynatma engellendi");
    // }




    const replayLastAudio = () => {
        if (!lastAudioUrl) return;

        console.log("AUDIO DEBUG: Replaying last audio");
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
        }

        const audio = new Audio(lastAudioUrl);
        audioPlayerRef.current = audio;
        setIsPlaying(true);

        audio.onended = () => {
            setIsPlaying(false);
            setStatus(handsFreeMode ? "Otomatik mod aktif (Dinleniyor...)" : "Hazır");
            if (handsFreeMode && stream) startVAD(stream);
        };

        audio.play().catch(e => {
            console.error("AUDIO DEBUG: Replay failed:", e);
            setIsPlaying(false);
        });
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Card style={{ width: '100%', maxWidth: '600px', height: '80vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Header */}
                <div style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center' }}>
                    <Button variant="ghost" onClick={onExit} style={{ marginRight: '1rem' }}>
                        <ArrowLeft size={20} />
                    </Button>
                    <h2 style={{ margin: 0 }}>Voice Quiz</h2>
                    <Button
                        variant="ghost"
                        onClick={toggleHandsFree}
                        style={{
                            marginLeft: 'auto',
                            color: handsFreeMode ? '#10B981' : '#6B7280',
                            backgroundColor: handsFreeMode ? '#D1FAE5' : 'transparent',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            fontSize: '0.8rem', padding: '0.5rem 0.8rem',
                            border: handsFreeMode ? '1px solid #10B981' : 'none'
                        }}
                    >
                        {handsFreeMode && (
                            <div style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                backgroundColor: isSpeaking ? '#EF4444' : '#E5E7EB',
                                transition: 'background-color 0.1s'
                            }} />
                        )}
                        {handsFreeMode ? <Zap size={16} /> : <ZapOff size={16} />}
                        {handsFreeMode ? 'AUTO ON' : 'AUTO OFF'}
                    </Button>
                </div>

                {/* Sub-header status for processing */}
                <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.85rem', color: isProcessing ? '#F59E0B' : '#10B981', backgroundColor: '#F9FAFB' }}>
                    {status}
                </div>

                {/* Messages Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {permissionDenied && (
                        <div style={{
                            backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#B91C1C',
                            padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem'
                        }}>
                            <h4 style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
                                <MicOff size={18} /> Mikrofon Erişimi Reddedildi
                            </h4>
                            <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                Tarayıcınız mikrofon kullanımını engelledi. Devam etmek için:
                            </p>
                            <ol style={{ fontSize: '0.9rem', paddingLeft: '1.5rem', margin: 0 }}>
                                <li>Adres çubuğunun solundaki <strong>kilit (🔒)</strong> veya <strong>ayar</strong> ikonuna tıklayın.</li>
                                <li><strong>Mikrofon</strong> iznini bulun ve <strong>"İzin Ver" (Allow)</strong> olarak değiştirin veya <strong>"Sıfırla" (Reset)</strong> diyerek sayfayı yenileyin.</li>
                            </ol>
                        </div>
                    )}

                    {messages.length === 0 && !permissionDenied && (
                        <div style={{ textAlign: 'center', color: '#999', marginTop: '2rem' }}>
                            <p>Quiz'e başlamak için {handsFreeMode ? '"AUTO ON"' : 'mikrofon butonuna'} tıklayın ve konuşun.</p>
                            {handsFreeMode && <p style={{ fontSize: '0.8rem', color: '#10B981' }}>Hands-free modu aktif. Konuşmanız bittiğinde otomatik algılanır.</p>}
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            backgroundColor: msg.role === 'user' ? '#DBEAFE' : '#F3F4F6',
                            color: '#1F2937',
                            padding: '0.75rem 1rem',
                            borderRadius: '1rem',
                            maxWidth: '80%',
                            display: 'flex',
                            gap: '0.5rem',
                            borderBottomRightRadius: msg.role === 'user' ? '0' : '1rem',
                            borderBottomLeftRadius: msg.role === 'assistant' ? '0' : '1rem',
                        }}>
                            {msg.role === 'assistant' && (
                                <div style={{
                                    width: '24px', height: '24px', borderRadius: '50%', background: '#10B981',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>AI</span>
                                </div>
                            )}
                            <div>{msg.content}</div>
                        </div>
                    ))}
                    {isProcessing && (
                        <div style={{ alignSelf: 'flex-start', color: '#666', fontSize: '0.9rem', padding: '0.5rem' }}>
                            <span className="dot-typing"></span> Thinking...
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div style={{ padding: '2rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isProcessing || isPlaying || permissionDenied || (handsFreeMode && !isRecording)}
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: permissionDenied ? '#9CA3AF' : (isRecording ? '#EF4444' : (isProcessing ? '#9CA3AF' : (handsFreeMode ? '#10B981' : '#3B82F6'))),
                            color: 'white',
                            cursor: (isProcessing || isPlaying || permissionDenied) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.2s',
                            transform: isRecording ? 'scale(1.1)' : 'scale(1)'
                        }}
                    >
                        {handsFreeMode ? (isRecording ? <Mic size={32} /> : <Zap size={32} />) : (isRecording ? <MicOff size={32} /> : <Mic size={32} />)}
                    </button>

                    {isPlaying && (
                        <div style={{ position: 'absolute', right: '2rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Volume2 size={24} className="animate-pulse" />
                            <span>Speaking...</span>
                        </div>
                    )}

                    {!isPlaying && lastAudioUrl && (
                        <Button
                            variant="ghost"
                            onClick={replayLastAudio}
                            style={{ position: 'absolute', right: '2rem', color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Volume2 size={24} />
                            <span>Replay</span>
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default QuizInterface;
