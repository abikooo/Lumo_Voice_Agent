// LumoAI Background Service Worker
// Tab audio capture, oturum yönetimi, ve content script ile mikrofon kaydı

const BACKEND_URL = "http://localhost:8000";
let currentSessionId = null;
let isCapturing = false;
let offscreenReady = false;
let wakeWordEnabled = false;
let wakeWordTabId = null;

// ========== Session Management ==========

async function createSession() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/voice/session/new`, {
            method: "POST",
        });
        const data = await response.json();
        currentSessionId = data.session_id;
        console.log("[BG] Session created:", currentSessionId);
        return currentSessionId;
    } catch (error) {
        console.error("[BG] Failed to create session:", error);
        return null;
    }
}

async function endSession() {
    if (currentSessionId) {
        try {
            await fetch(`${BACKEND_URL}/api/voice/session/${currentSessionId}`, {
                method: "DELETE",
            });
        } catch (e) { }
        currentSessionId = null;
    }
}

// ========== Offscreen Document ==========

async function ensureOffscreenDocument() {
    try {
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ["OFFSCREEN_DOCUMENT"],
        });

        if (existingContexts.length > 0) {
            offscreenReady = true;
            return;
        }

        await chrome.offscreen.createDocument({
            url: "offscreen.html",
            reasons: ["USER_MEDIA", "AUDIO_PLAYBACK"],
            justification: "Tab audio capture for LumoAI",
        });

        // Offscreen yüklenmesini bekle
        await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                offscreenReady = true;
                resolve();
            }, 2000);

            const onReady = (msg) => {
                if (msg.type === "offscreen-ready" && msg.target === "background") {
                    offscreenReady = true;
                    clearTimeout(timeout);
                    chrome.runtime.onMessage.removeListener(onReady);
                    resolve();
                }
            };
            chrome.runtime.onMessage.addListener(onReady);
        });

        console.log("[BG] Offscreen ready");
    } catch (error) {
        console.error("[BG] Offscreen error:", error);
    }
}

// ========== Tab Audio Capture ==========

async function startTabCapture() {
    if (isCapturing) return;

    try {
        await createSession();
        await ensureOffscreenDocument();

        const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
        if (!tab?.id) return;

        const streamId = await chrome.tabCapture.getMediaStreamId({
            targetTabId: tab.id,
        });

        chrome.runtime.sendMessage({
            target: "offscreen",
            type: "start-capture",
            streamId,
            sessionId: currentSessionId,
            backendUrl: BACKEND_URL,
        });

        isCapturing = true;
        console.log("[BG] Tab capture started");
    } catch (error) {
        console.error("[BG] Tab capture failed:", error);
    }
}

function stopTabCapture() {
    if (!isCapturing) return;
    chrome.runtime.sendMessage({ target: "offscreen", type: "stop-capture" });
    isCapturing = false;
}

// ========== Content Script ile Mikrofon ==========

async function startMicViaContentScript() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) throw new Error("Aktif sekme bulunamadı");

        // Sayfaya mikrofon kayıt kodu enjekte et
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Sayfa context'inde çalışan mikrofon kayıt kodu
                if (window._lumoMicRecorder) {
                    console.log("[LumoAI] Already recording");
                    return;
                }

                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then((stream) => {
                        const recorder = new MediaRecorder(stream, {
                            mimeType: "audio/webm;codecs=opus",
                        });
                        const chunks = [];

                        recorder.ondataavailable = (e) => {
                            if (e.data.size > 0) chunks.push(e.data);
                        };

                        recorder.onstop = async () => {
                            stream.getTracks().forEach((t) => t.stop());
                            window._lumoMicRecorder = null;

                            if (chunks.length === 0) {
                                window.postMessage({ type: "LUMO_MIC_ERROR", error: "Ses kaydedilemedi" }, "*");
                                return;
                            }

                            const blob = new Blob(chunks, { type: "audio/webm" });
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64 = reader.result.split(",")[1];
                                window.postMessage({ type: "LUMO_MIC_DATA", audioBase64: base64 }, "*");
                            };
                            reader.readAsDataURL(blob);
                        };

                        recorder.start();
                        window._lumoMicRecorder = recorder;
                        window.postMessage({ type: "LUMO_MIC_STARTED" }, "*");
                        console.log("[LumoAI] Mic recording started");
                    })
                    .catch((err) => {
                        console.error("[LumoAI] Mic error:", err);
                        window.postMessage({ type: "LUMO_MIC_ERROR", error: err.message }, "*");
                    });
            },
        });

        // Content script listener enjekte et (mesajları yakalayıp extension'a ilet)
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                if (window._lumoMicListenerInstalled) return;
                window._lumoMicListenerInstalled = true;

                window.addEventListener("message", (event) => {
                    if (event.source !== window) return;
                    if (event.data.type === "LUMO_MIC_DATA") {
                        chrome.runtime.sendMessage({
                            target: "background",
                            type: "mic-audio-data",
                            audioBase64: event.data.audioBase64,
                        });
                    } else if (event.data.type === "LUMO_MIC_STARTED") {
                        chrome.runtime.sendMessage({
                            target: "background",
                            type: "mic-started",
                        });
                    } else if (event.data.type === "LUMO_MIC_ERROR") {
                        chrome.runtime.sendMessage({
                            target: "background",
                            type: "mic-error",
                            error: event.data.error,
                        });
                    }
                });
            },
        });

        return { status: "starting" };
    } catch (error) {
        console.error("[BG] Content script mic failed:", error);
        return { error: error.message };
    }
}

async function stopMicViaContentScript() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                if (window._lumoMicRecorder && window._lumoMicRecorder.state === "recording") {
                    window._lumoMicRecorder.stop();
                }
            },
        });
    } catch (error) {
        console.error("[BG] Stop mic failed:", error);
    }
}

// ========== Hey Lumo Wake Word ==========

async function startWakeWordDetection() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) throw new Error("Aktif sekme bulunamadı");
        wakeWordTabId = tab.id;

        // Web Speech API dinleyici enjekte et
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                if (window._lumoWakeWord) {
                    window._lumoWakeWord.abort();
                    window._lumoWakeWord = null;
                }

                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) {
                    console.error("[LumoAI] SpeechRecognition desteklenmiyor");
                    return;
                }

                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = "tr-TR";
                recognition.maxAlternatives = 3;

                let isListeningForQuestion = false;
                let silenceTimer = null;

                recognition.onresult = (event) => {
                    if (isListeningForQuestion) {
                        clearTimeout(silenceTimer);
                        silenceTimer = setTimeout(() => {
                            console.log("[LumoAI] Sessizlik — soru gönderiliyor");
                            isListeningForQuestion = false;
                            window.postMessage({ type: "LUMO_WAKE_STOP_MIC" }, "*");
                        }, 2000);
                        return;
                    }

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const result = event.results[i];
                        for (let j = 0; j < result.length; j++) {
                            const t = result[j].transcript.toLowerCase().trim();
                            if (t.includes("lumo") || t.includes("lümo") || t.includes("lumoo") || t.includes("lumu")) {
                                console.log("[LumoAI] Wake word algılandı:", t);
                                isListeningForQuestion = true;
                                window.postMessage({ type: "LUMO_WAKE_DETECTED" }, "*");
                                clearTimeout(silenceTimer);
                                silenceTimer = setTimeout(() => {
                                    isListeningForQuestion = false;
                                    window.postMessage({ type: "LUMO_WAKE_STOP_MIC" }, "*");
                                }, 8000);
                                return;
                            }
                        }
                    }
                };

                recognition.onerror = (event) => {
                    if (event.error === "no-speech" || event.error === "aborted") {
                        setTimeout(() => {
                            if (window._lumoWakeWord) {
                                try { recognition.start(); } catch (e) { }
                            }
                        }, 500);
                    }
                };

                recognition.onend = () => {
                    if (window._lumoWakeWord) {
                        setTimeout(() => {
                            if (window._lumoWakeWord) {
                                try { recognition.start(); } catch (e) { }
                            }
                        }, 300);
                    }
                };

                recognition.start();
                window._lumoWakeWord = recognition;
                console.log("[LumoAI] Wake word dinleme başladı — 'Hey Lumo' deyin");
            },
        });

        // Wake word mesaj dinleyici enjekte et
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                if (window._lumoWakeListenerInstalled) return;
                window._lumoWakeListenerInstalled = true;

                window.addEventListener("message", (event) => {
                    if (event.source !== window) return;
                    if (event.data.type === "LUMO_WAKE_DETECTED") {
                        chrome.runtime.sendMessage({ target: "background", type: "wake-word-detected" });
                    } else if (event.data.type === "LUMO_WAKE_STOP_MIC") {
                        chrome.runtime.sendMessage({ target: "background", type: "wake-auto-stop" });
                    }
                });
            },
        });

        wakeWordEnabled = true;
        console.log("[BG] Wake word detection enabled");
        return { status: "enabled" };
    } catch (error) {
        console.error("[BG] Wake word failed:", error);
        return { error: error.message };
    }
}

async function stopWakeWordDetection() {
    if (wakeWordTabId) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: wakeWordTabId },
                func: () => {
                    if (window._lumoWakeWord) {
                        window._lumoWakeWord.abort();
                        window._lumoWakeWord = null;
                        console.log("[LumoAI] Wake word durduruldu");
                    }
                },
            });
        } catch (e) { }
    }
    wakeWordEnabled = false;
    wakeWordTabId = null;
}

async function pauseWakeWordTemporarily() {
    if (!wakeWordTabId) return;
    try {
        await chrome.scripting.executeScript({
            target: { tabId: wakeWordTabId },
            func: () => {
                if (window._lumoWakeWord) {
                    window._lumoWakeWord.abort();
                    console.log("[LumoAI] Wake word geçici durakladı");
                }
            },
        });
    } catch (e) { }
}

async function resumeWakeWord() {
    if (!wakeWordTabId || !wakeWordEnabled) return;
    try {
        await chrome.scripting.executeScript({
            target: { tabId: wakeWordTabId },
            func: () => {
                if (window._lumoWakeWord) return; // zaten çalışıyor
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) return;

                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = "tr-TR";
                recognition.maxAlternatives = 3;

                let isListeningForQuestion = false;
                let silenceTimer = null;

                recognition.onresult = (event) => {
                    if (isListeningForQuestion) {
                        clearTimeout(silenceTimer);
                        silenceTimer = setTimeout(() => {
                            isListeningForQuestion = false;
                            window.postMessage({ type: "LUMO_WAKE_STOP_MIC" }, "*");
                        }, 2000);
                        return;
                    }
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const result = event.results[i];
                        for (let j = 0; j < result.length; j++) {
                            const t = result[j].transcript.toLowerCase().trim();
                            if (t.includes("lumo") || t.includes("lümo") || t.includes("lumoo") || t.includes("lumu")) {
                                isListeningForQuestion = true;
                                window.postMessage({ type: "LUMO_WAKE_DETECTED" }, "*");
                                clearTimeout(silenceTimer);
                                silenceTimer = setTimeout(() => {
                                    isListeningForQuestion = false;
                                    window.postMessage({ type: "LUMO_WAKE_STOP_MIC" }, "*");
                                }, 8000);
                                return;
                            }
                        }
                    }
                };

                recognition.onerror = (event) => {
                    if (event.error === "no-speech" || event.error === "aborted") {
                        setTimeout(() => {
                            if (window._lumoWakeWord) try { recognition.start(); } catch (e) { }
                        }, 500);
                    }
                };

                recognition.onend = () => {
                    if (window._lumoWakeWord) {
                        setTimeout(() => {
                            if (window._lumoWakeWord) try { recognition.start(); } catch (e) { }
                        }, 300);
                    }
                };

                recognition.start();
                window._lumoWakeWord = recognition;
                console.log("[LumoAI] Wake word tekrar başladı");
            },
        });
    } catch (e) { }
}

// ========== Message Handler ==========

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target && message.target !== "background") return;

    switch (message.type) {
        case "activate":
            startTabCapture()
                .then(() => sendResponse({ status: "capturing", sessionId: currentSessionId }))
                .catch((err) => sendResponse({ error: err.message }));
            return true;

        case "deactivate":
            stopTabCapture();
            endSession();
            sendResponse({ status: "stopped" });
            break;

        case "get-status":
            sendResponse({ isCapturing, sessionId: currentSessionId, wakeWordEnabled });
            break;

        // Popup mikrofon başlatmak istiyor
        case "start-mic":
            startMicViaContentScript()
                .then((result) => sendResponse(result))
                .catch((err) => sendResponse({ error: err.message }));
            return true;

        // Popup mikrofon durdurmak istiyor
        case "stop-mic":
            stopMicViaContentScript();
            sendResponse({ status: "stopping" });
            break;

        // Content script'ten mikrofon başladı sinyali
        case "mic-started":
            try { chrome.runtime.sendMessage({ target: "popup", type: "mic-recording-started" }); } catch (e) { }
            break;

        // Content script'ten mikrofon verisi geldi
        case "mic-audio-data":
            handleUserQuestion(message.audioBase64, currentSessionId)
                .catch((err) => {
                    try { chrome.runtime.sendMessage({ target: "popup", type: "question-result", error: err.message }); } catch (e) { }
                });
            break;

        // Content script'ten mikrofon hatası
        case "mic-error":
            try { chrome.runtime.sendMessage({ target: "popup", type: "mic-recording-error", error: message.error }); } catch (e) { }
            break;

        case "offscreen-ready":
            offscreenReady = true;
            break;

        // ========== Wake Word ==========
        case "enable-wakeword":
            startWakeWordDetection()
                .then((result) => sendResponse(result))
                .catch((err) => sendResponse({ error: err.message }));
            return true;

        case "disable-wakeword":
            stopWakeWordDetection();
            sendResponse({ status: "disabled" });
            break;

        case "wake-word-detected":
            console.log("[BG] Wake word detected! Pausing recognition, starting mic...");
            // Wake word'ü geçici duraklat (mikrofon çakışması önlenir)
            pauseWakeWordTemporarily();
            // Lumo henüz aktif değilse önce aktive et
            if (!isCapturing) {
                startTabCapture().then(() => {
                    startMicViaContentScript();
                    try { chrome.runtime.sendMessage({ target: "popup", type: "wake-activated" }); } catch (e) { }
                });
            } else {
                startMicViaContentScript();
            }
            // NOT: mic-recording-started content script'ten gelecek, burada göndermiyoruz
            break;

        case "wake-auto-stop":
            console.log("[BG] Wake auto-stop — sending question");
            stopMicViaContentScript();
            // Kayıt bittikten sonra wake word'ü tekrar başlat
            setTimeout(() => {
                if (wakeWordEnabled) resumeWakeWord();
            }, 2000);
            break;
    }
});

// ========== Kullanıcı Soru İşleme ==========

async function handleUserQuestion(audioBase64, sessionId) {
    if (!sessionId) return { error: "Önce Lumo'yu aktive edin" };

    try {
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const formData = new FormData();
        formData.append("audio", new Blob([bytes], { type: "audio/webm" }), "question.webm");
        formData.append("session_id", sessionId);

        // 1. Adım: STT + LLM (metin yanıt al)
        const response = await fetch(`${BACKEND_URL}/api/voice/ask`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) throw new Error(`Backend error: ${response.status}`);
        const result = await response.json();

        if (result.error) return result;

        // Metin yanıtı hemen gönder (popup anında gösterir)
        try {
            chrome.runtime.sendMessage({
                target: "popup",
                type: "question-result",
                ai_response: result.ai_response,
                user_transcript: result.user_transcript,
            });
        } catch (e) { }

        // 2. Adım: Streaming TTS (ses al)
        const ttsResponse = await fetch(`${BACKEND_URL}/api/voice/speak-stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: result.ai_response, response_format: "mp3" }),
        });

        if (!ttsResponse.ok) {
            console.warn("[BG] Streaming TTS failed, skipping audio");
            return result;
        }

        // MP3 stream'i oku ve base64'e çevir
        const audioBuffer = await ttsResponse.arrayBuffer();
        const audioBase64Result = btoa(
            new Uint8Array(audioBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        // Ses verisini popup'a gönder
        try {
            chrome.runtime.sendMessage({
                target: "popup",
                type: "audio-stream-ready",
                audio_base64: audioBase64Result,
                audio_format: "mp3",
            });
        } catch (e) { }

        return { ...result, audio_streamed: true };
    } catch (error) {
        console.error("[BG] Question failed:", error);
        return { error: error.message };
    }
}
