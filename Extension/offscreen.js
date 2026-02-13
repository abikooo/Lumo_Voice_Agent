// LumoAI Offscreen Audio Processor
// SADECE tab ses yakalama, mikrofon ve TTS oynatma (Stream uyumlu)

const TARGET = "offscreen";

let mediaStream = null;
let captureInterval = null;
let sessionId = null;
// Backend adresinin varsayılanı. startCapture ile güncellenebilir.
let backendUrl = "http://localhost:8000";

let micStream = null;
let micRecorder = null;
let micChunks = [];
let currentAudio = null; // currently playing TTS audio
let authToken = null;
let queuedAudioData = [];
let queuePlaying = false;
const CHUNK_INTERVAL_MS = 10000;

// ========== Message Handler ==========

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== TARGET) return;

    switch (message.type) {
        // --- YENİ TTS MANTIĞI ---
        case "SPEAK":
            // Arka plandan sadece metni alıyoruz, sesi burada indirip çalıyoruz.
            playTtsStream(message.text, message.voiceId, message.backendUrl, message.token, message.speed);
            sendResponse({ status: "processing_tts" });
            break;

        case "stop-tts":
            stopAudioPlayback();
            sendResponse({ status: "stopped" });
            break;
        // -------------------------

        case "start-capture":
            startCapture(message.streamId, message.sessionId, message.backendUrl, message.token);
            sendResponse({ status: "ok" });
            break;

        case "stop-capture":
            stopCapture();
            sendResponse({ status: "ok" });
            break;

        case "start-mic":
            startMic(message.sessionId, message.backendUrl, message.token);
            sendResponse({ status: "ok" });
            break;

        case "stop-mic":
            stopMic();
            sendResponse({ status: "ok" });
            break;

        // --- ESKİ YÖNTEMLER (Yedek olarak tutuldu) ---
        case "play-audio":
            if (message.audioUrl) playAudioUrl(message.audioUrl);
            else playAudioRaw(message.audioBase64, message.format);
            sendResponse({ status: "playing" });
            break;

        case "play-audio-data":
            if (message.appendQueue) enqueueAudioData(message.audioData);
            else playAudioData(message.audioData);
            sendResponse({ status: "playing_stream" });
            break;
    }
    // Asenkron işlemler için return true gerekebilir ama fetch'i await etmediğimiz için gerek yok.
});

// ========== TTS Streaming Logic (YENİ - ÇÖZÜM) ==========

async function playTtsStream(text, voiceId = "ali", urlOverride = null, token = null, speed = 0.9) {
    try {
        stopAudioPlayback(); // Varsa önceki sesi sustur

        // Eğer mesajla özel bir URL geldiyse onu kullan, yoksa global backendUrl
        const baseUrl = urlOverride || backendUrl;
        const ttsUrl = `${baseUrl}/api/voice/speak-stream`;
        if (token) authToken = token;

        console.log(`[Offscreen] TTS Fetching: "${text.substring(0, 20)}..." -> ${ttsUrl}`);

        const headers = { "Content-Type": "application/json" };
        if (authToken) {
            headers["Authorization"] = `Bearer ${authToken}`;
        }

        // Backend'e POST isteği (Stream=True)
        const response = await fetch(ttsUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                text: text,
                voice_id: voiceId,
                response_format: "wav",
                speed: speed
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`TTS API Hatası (${response.status}): ${errText}`);
        }

        // Gelen binary akışı (stream) Blob'a çevir
        const audioBlob = await response.blob();
        if (audioBlob.size === 0) throw new Error("Gelen ses dosyası boş!");

        // Blob'dan geçici URL oluştur
        const audioUrl = URL.createObjectURL(audioBlob);

        currentAudio = new Audio(audioUrl);

        currentAudio.onended = () => {
            URL.revokeObjectURL(audioUrl); // Bellek temizliği
            currentAudio = null;
            chrome.runtime.sendMessage({ target: "background", type: "audio-playback-ended" });
        };

        currentAudio.onerror = (e) => {
            console.error("[Offscreen] Ses çalma hatası:", e);
            URL.revokeObjectURL(audioUrl);
        };

        await currentAudio.play();
        console.log("[Offscreen] Ses çalınıyor...");

    } catch (error) {
        console.error("[Offscreen] TTS işlemi başarısız:", error);
        chrome.runtime.sendMessage({
            target: "background",
            type: "audio-playback-error",
            error: error.message
        });
    }
}

function stopAudioPlayback() {
    queuedAudioData = [];
    queuePlaying = false;
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = ""; // Kaynağı boşalt
        currentAudio = null;
        console.log("[Offscreen] Ses manuel durduruldu.");
    }
}

// ========== Offscreen Setup ==========

// Offscreen hazır olduğunu bildir
chrome.runtime.sendMessage({ target: "background", type: "offscreen-ready" });

// Keep-alive heartbeat
setInterval(() => {
    // console.log("[Offscreen] Heartbeat");
}, 30000);


// ========== Tab Audio Capture ==========

async function startCapture(streamId, sid, url, token = null) {
    sessionId = sid;
    if (url) backendUrl = url;
    if (token) authToken = token;

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: "tab",
                    chromeMediaSourceId: streamId,
                },
            },
        });

        console.log("[Offscreen] Tab stream obtained");

        // Yakalanan sesi kullanıcıya geri oynat (video sesi kesilmesin)
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(audioContext.destination);

        startPeriodicRecording();
    } catch (error) {
        console.error("[Offscreen] Failed to get tab stream:", error);
    }
}

function startPeriodicRecording() {
    recordChunk();
    captureInterval = setInterval(() => recordChunk(), CHUNK_INTERVAL_MS);
}

function recordChunk() {
    if (!mediaStream || !mediaStream.active) return;

    const recorder = new MediaRecorder(mediaStream, {
        mimeType: "audio/webm;codecs=opus",
    });

    const chunks = [];

    recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = async () => {
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: "audio/webm" });
        if (blob.size < 1000) return;
        await sendVideoAudioToBackend(blob);
    };

    recorder.start();

    setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
    }, CHUNK_INTERVAL_MS - 500);
}


// ========== Microphone Capture ==========

async function startMic(sid, url, token = null) {
    sessionId = sid;
    if (url) backendUrl = url;
    if (token) authToken = token;
    micChunks = [];

    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("[Offscreen] Mic stream obtained");

        micRecorder = new MediaRecorder(micStream, {
            mimeType: "audio/webm;codecs=opus",
        });

        micRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) micChunks.push(event.data);
        };

        micRecorder.onstop = async () => {
            micStream.getTracks().forEach(t => t.stop());
            micStream = null;

            if (micChunks.length === 0) return;

            const blob = new Blob(micChunks, { type: "audio/webm" });
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(",")[1];
                chrome.runtime.sendMessage({
                    target: "background",
                    type: "mic-audio-data",
                    audioBase64: base64,
                });
            };
            reader.readAsDataURL(blob);
        };

        micRecorder.start();
        chrome.runtime.sendMessage({ target: "background", type: "mic-started" });

    } catch (error) {
        console.error("[Offscreen] Mic failed:", error);
        chrome.runtime.sendMessage({
            target: "background",
            type: "mic-error",
            error: error.message
        });
    }
}

function stopMic() {
    if (micRecorder && micRecorder.state === "recording") {
        micRecorder.stop();
    }
}

// ========== Backend Upload (Capture için) ==========

async function sendVideoAudioToBackend(audioBlob) {
    try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "video_audio.webm");
        formData.append("session_id", sessionId);

        if (!authToken) {
            console.warn("[Offscreen] Missing auth token. Stopping capture.");
            stopCapture();
            return;
        }

        const response = await fetch(`${backendUrl}/api/voice/transcribe-video`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${authToken}`
            },
            body: formData,
        });

        if (response.ok) {
            // Transkript sonucu vs.
        }
    } catch (error) {
        console.error("[Offscreen] Send failed:", error);
    }
}

// ========== Legacy Playback Helpers (Yedek) ==========

function playAudioData(dataUrl) {
    try {
        stopAudioPlayback();
        const audio = new Audio(dataUrl);
        currentAudio = audio;
        audio.onended = () => {
            chrome.runtime.sendMessage({ target: "background", type: "audio-playback-ended" });
            currentAudio = null;
        };
        audio.play().catch(console.error);
    } catch (e) { console.error(e); }
}

function enqueueAudioData(dataUrl) {
    if (!dataUrl) return;
    queuedAudioData.push(dataUrl);
    if (!queuePlaying) processAudioQueue();
}

function processAudioQueue() {
    if (queuePlaying) return;
    queuePlaying = true;

    const playNext = () => {
        if (queuedAudioData.length === 0) {
            queuePlaying = false;
            currentAudio = null;
            chrome.runtime.sendMessage({ target: "background", type: "audio-playback-ended" });
            return;
        }

        const dataUrl = queuedAudioData.shift();
        const audio = new Audio(dataUrl);
        currentAudio = audio;

        audio.onended = () => playNext();
        audio.onerror = () => playNext();
        audio.play().catch(() => playNext());
    };

    playNext();
}

function playAudioUrl(url) {
    try {
        stopAudioPlayback();
        const audio = new Audio(url);
        currentAudio = audio;
        audio.onended = () => {
            chrome.runtime.sendMessage({ target: "background", type: "audio-playback-ended" });
            currentAudio = null;
        };
        audio.play().catch(console.error);
    } catch (e) { }
}

function playAudioRaw(base64Audio, format = "mp3") {
    try {
        stopAudioPlayback();
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const mimeType = format === "mp3" ? "audio/mpeg" : `audio/${format}`;
        const blob = new Blob([bytes], { type: mimeType });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        currentAudio = audio;

        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            chrome.runtime.sendMessage({ target: "background", type: "audio-playback-ended" });
            currentAudio = null;
        };
        audio.play();
    } catch (e) { }
}

function stopCapture() {
    if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
    }
}


