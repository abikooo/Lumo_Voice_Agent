// LumoAI Offscreen Audio Processor
// SADECE tab ses yakalama — mikrofon popup'ta yapılır

const TARGET = "offscreen";

let mediaStream = null;
let captureInterval = null;
let sessionId = null;
let backendUrl = "http://localhost:8000";

const CHUNK_INTERVAL_MS = 10000;

// ========== Message Handler ==========

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== TARGET) return;

    switch (message.type) {
        case "start-capture":
            startCapture(message.streamId, message.sessionId, message.backendUrl);
            sendResponse({ status: "ok" });
            break;

        case "stop-capture":
            stopCapture();
            sendResponse({ status: "ok" });
            break;
    }
});

// Offscreen hazır olduğunu bildir
chrome.runtime.sendMessage({ target: "background", type: "offscreen-ready" });

// ========== Tab Audio Capture ==========

async function startCapture(streamId, sid, url) {
    sessionId = sid;
    backendUrl = url || backendUrl;

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: "tab",
                    chromeMediaSourceId: streamId,
                },
            },
        });

        console.log("[Offscreen] Media stream obtained");

        // Yakalanan sesi kullanıcıya geri oynat (video sesi kesilmesin)
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(audioContext.destination);

        startPeriodicRecording();
    } catch (error) {
        console.error("[Offscreen] Failed to get media stream:", error);
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

// ========== Backend ==========

async function sendVideoAudioToBackend(audioBlob) {
    try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "video_audio.webm");
        formData.append("session_id", sessionId);

        const response = await fetch(`${backendUrl}/api/voice/transcribe-video`, {
            method: "POST",
            body: formData,
        });

        if (response.ok) {
            const result = await response.json();
            console.log("[Offscreen] Transcript:", result.transcript?.substring(0, 80));
        }
    } catch (error) {
        console.error("[Offscreen] Send failed:", error);
    }
}

// ========== Cleanup ==========

function stopCapture() {
    if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
    }

    console.log("[Offscreen] Capture stopped");
}
