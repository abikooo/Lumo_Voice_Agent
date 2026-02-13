// LumoAI Background Service Worker
// Tab audio capture, oturum yönetimi, ve content script ile mikrofon kaydı

const BACKEND_URL = "http://localhost:8000";
// State is now managed via chrome.storage.local
// Keys: "lumo_sessionId", "lumo_isCapturing", "lumo_wakeWordEnabled"

let offscreenReady = false;
let wakeWordTabId = null;

// ========== Session Management ==========

async function getAuthToken() {
    const tokenData = await chrome.storage.local.get("token");
    return tokenData?.token || null;
}

async function getTtsSettings() {
    const data = await chrome.storage.local.get(["lumo_tts_voice", "lumo_tts_speed"]);
    const voiceId = typeof data?.lumo_tts_voice === "string" && data.lumo_tts_voice.trim()
        ? data.lumo_tts_voice.trim()
        : "ali";
    const speedRaw = Number(data?.lumo_tts_speed);
    const speed = Number.isFinite(speedRaw) ? Math.min(1.2, Math.max(0.6, speedRaw)) : 0.9;
    return { voiceId, speed };
}

async function getSessionId() {
    const data = await chrome.storage.local.get("lumo_sessionId");
    return data.lumo_sessionId || null;
}

async function setSessionId(id) {
    if (id) {
        await chrome.storage.local.set({ "lumo_sessionId": id });
    } else {
        await chrome.storage.local.remove("lumo_sessionId");
    }
}

async function getIsCapturing() {
    const data = await chrome.storage.local.get("lumo_isCapturing");
    return !!data.lumo_isCapturing;
}

async function setIsCapturing(val) {
    await chrome.storage.local.set({ "lumo_isCapturing": !!val });
}

async function createSession() {
    try {
        const token = await getAuthToken();
        if (!token) throw new Error("Not logged in");

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const videoUrl = tab?.url || "";

        const response = await fetch(`${BACKEND_URL}/api/voice/session/new`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ video_url: videoUrl })
        });
        if (!response.ok) throw new Error("Failed to create session");
        const data = await response.json();

        await setSessionId(data.session_id);
        console.log("[BG] Session created:", data.session_id);
        return data.session_id;
    } catch (error) {
        console.error("[BG] Failed to create session:", error);
        return null;
    }
}

async function endSession() {
    const currentSessionId = await getSessionId();
    if (currentSessionId) {
        try {
            const token = await getAuthToken();
            if (token) {
                await fetch(`${BACKEND_URL}/api/voice/session/${currentSessionId}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
            }
        } catch (e) { }
        await setSessionId(null);
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
    const isCapturing = await getIsCapturing();
    if (isCapturing) return;

    try {
        const sessionId = await createSession();
        const token = await getAuthToken();
        await ensureOffscreenDocument();

        const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
        if (!tab?.id) return;

        const streamId = await chrome.tabCapture.getMediaStreamId({
            targetTabId: tab.id,
        });

        if (!streamId) {
            console.error("[BG] Failed to get MediaStreamId");
            return;
        }

        chrome.runtime.sendMessage({
            target: "offscreen",
            type: "start-capture",
            streamId,
            sessionId: sessionId,
            backendUrl: BACKEND_URL,
            token,
        });

        await setIsCapturing(true);
        console.log("[BG] Tab capture started");
    } catch (error) {
        console.error("[BG] Tab capture failed:", error);
    }
}

async function stopTabCapture() {
    const isCapturing = await getIsCapturing();
    if (!isCapturing) return;
    chrome.runtime.sendMessage({ target: "offscreen", type: "stop-capture" });
    await setIsCapturing(false);
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
    // onMessage handler must return true for async sendResponse
    const asyncHandle = async () => {
        if (message.target && message.target !== "background") return;

        const currentSessionId = await getSessionId();
        const isCapturing = await getIsCapturing();
        const wakeWordEnabledData = await chrome.storage.local.get("lumo_wakeWordEnabled");
        const wakeWordEnabled = wakeWordEnabledData.lumo_wakeWordEnabled;

        switch (message.type) {
            case "activate":
                try {
                    await startTabCapture();
                    const sessionId = await getSessionId();
                    sendResponse({ status: "capturing", sessionId });
                } catch (err) {
                    sendResponse({ error: err.message });
                }
                break;

            case "deactivate":
                await stopTabCapture();
                await endSession();
                sendResponse({ status: "stopped" });
                break;

            case "get-status":
                sendResponse({ isCapturing, sessionId: currentSessionId, wakeWordEnabled });
                break;

            // Popup mikrofon başlatmak istiyor
            case "start-mic":
                // Use Offscreen instead of content script
                await ensureOffscreenDocument();
                const token = await getAuthToken();
                chrome.runtime.sendMessage({
                    target: "offscreen",
                    type: "start-mic",
                    sessionId: currentSessionId,
                    backendUrl: BACKEND_URL,
                    token,
                });
                // Response will be handled via "mic-started" message
                sendResponse({ status: "starting_offscreen" });
                break;

            // Popup mikrofon durdurmak istiyor
            case "stop-mic":
                chrome.runtime.sendMessage({ target: "offscreen", type: "stop-mic" });
                sendResponse({ status: "stopping" });
                break;

            // Content script'ten mikrofon başladı sinyali
            case "mic-started":
                try { chrome.runtime.sendMessage({ target: "popup", type: "mic-recording-started" }); } catch (e) { }
                break;

            // Content script'ten mikrofon verisi geldi
            case "mic-audio-data":
                try {
                    // Re-fetch session ID to be sure
                    const sessId = await getSessionId();
                    await handleUserQuestion(message.audioBase64, sessId);
                } catch (err) {
                    try { chrome.runtime.sendMessage({ target: "popup", type: "question-result", error: err.message }); } catch (e) { }
                }
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
                try {
                    const result = await startWakeWordDetection();
                    await chrome.storage.local.set({ "lumo_wakeWordEnabled": true });
                    sendResponse(result);
                } catch (err) {
                    sendResponse({ error: err.message });
                }
                break;

            case "disable-wakeword":
                await stopWakeWordDetection();
                await chrome.storage.local.set({ "lumo_wakeWordEnabled": false });
                sendResponse({ status: "disabled" });
                break;

            case "wake-word-detected":
                console.log("[BG] Wake word detected! Pausing recognition, starting mic...");
                // Wake word'ü geçici duraklat (mikrofon çakışması önlenir)
                await pauseWakeWordTemporarily();
                // Lumo henüz aktif değilse önce aktive et
                if (!isCapturing) {
                    await startTabCapture();
                    await startMicViaContentScript();
                    try { chrome.runtime.sendMessage({ target: "popup", type: "wake-activated" }); } catch (e) { }
                } else {
                    await startMicViaContentScript();
                }
                // NOT: mic-recording-started content script'ten gelecek, burada göndermiyoruz
                break;

            case "wake-auto-stop":
                console.log("[BG] Wake auto-stop — sending question");
                await stopMicViaContentScript();
                // Kayıt bittikten sonra wake word'ü tekrar başlat
                setTimeout(async () => {
                    const enabledData = await chrome.storage.local.get("lumo_wakeWordEnabled");
                    if (enabledData.lumo_wakeWordEnabled) await resumeWakeWord();
                }, 2000);
                break;

            case "audio-playback-ended":
                try { chrome.runtime.sendMessage({ target: "popup", type: "audio-ended" }); } catch (e) { }
                break;

            case "audio-playback-error":
                try {
                    chrome.runtime.sendMessage({
                        target: "popup",
                        type: "audio-error",
                        error: message.error
                    });
                } catch (e) { }
                break;
        }
    };

    asyncHandle();
    return true; // Keep message channel open for async response
});

// ========== Kullanıcı Soru İşleme (DÜZELTİLDİ) ==========

async function handleUserQuestion(audioBase64, sessionId) {
    if (!sessionId) return { error: "Once Lumo'yu aktive edin" };

    try {
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const formData = new FormData();
        formData.append("audio", new Blob([bytes], { type: "audio/webm" }), "question.webm");
        formData.append("session_id", sessionId);

        const tokenData = await chrome.storage.local.get("token");
        const token = tokenData.token;

        const response = await fetch(`${BACKEND_URL}/api/voice/ask-stream`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData,
        });

        if (!response.ok) throw new Error(`Backend error: ${response.status}`);

        await ensureOffscreenDocument();
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Stream reader unavailable");

        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let userTranscript = "";
        let fullAiResponse = "";
        let audioStarted = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                let evt = null;
                try {
                    evt = JSON.parse(trimmed);
                } catch (e) {
                    continue;
                }

                if (evt.type === "user_transcript") {
                    userTranscript = evt.text || "";
                } else if (evt.type === "text_delta") {
                    fullAiResponse += evt.delta || "";
                    try {
                        chrome.runtime.sendMessage({
                            target: "popup",
                            type: "question-result",
                            ai_response: fullAiResponse,
                            user_transcript: userTranscript,
                        });
                    } catch (e) { }
                } else if (evt.type === "audio_chunk" && evt.audio_base64) {
                    if (!audioStarted) {
                        audioStarted = true;
                        try {
                            chrome.runtime.sendMessage({
                                target: "popup",
                                type: "audio-stream-ready",
                                audio_format: evt.format || "wav",
                                playing_in_background: true
                            });
                        } catch (e) { }
                    }

                    const fmt = (evt.format || "wav").toLowerCase();
                    const mime = fmt === "mp3" ? "audio/mpeg" : `audio/${fmt}`;
                    const dataUrl = `data:${mime};base64,${evt.audio_base64}`;
                    chrome.runtime.sendMessage({
                        target: "offscreen",
                        type: "play-audio-data",
                        audioData: dataUrl,
                        appendQueue: true,
                    });
                } else if (evt.type === "done") {
                    if (evt.ai_response) fullAiResponse = evt.ai_response;
                }
            }
        }

        try {
            chrome.runtime.sendMessage({
                target: "popup",
                type: "question-result",
                ai_response: fullAiResponse,
                user_transcript: userTranscript,
            });
        } catch (e) { }

        return { ai_response: fullAiResponse, user_transcript: userTranscript, audio_streamed: audioStarted };

    } catch (error) {
        console.error("[BG] Question failed:", error);
        return { error: error.message };
    }
}

