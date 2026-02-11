// LumoAI Extension - Popup Script
// Mikrofon content script üzerinden web sayfasında çalışır

const BACKEND_URL = "http://localhost:8000";
const TARGET = "popup";

let heyLumoToggle, activateBtn, deactivateBtn, historyBtn, settingsBtn;
let statusIndicator, statusText;
let isActivated = false;
let isRecording = false;

document.addEventListener("DOMContentLoaded", () => {
    heyLumoToggle = document.getElementById("heyLumoToggle");
    activateBtn = document.getElementById("activateBtn");
    deactivateBtn = document.getElementById("deactivateBtn");
    historyBtn = document.getElementById("historyBtn");
    settingsBtn = document.getElementById("settingsBtn");
    statusIndicator = document.getElementById("statusIndicator");
    statusText = document.getElementById("statusText");

    chrome.runtime.sendMessage({ target: "background", type: "get-status" }, (response) => {
        if (response && response.isCapturing) {
            setActivated(true);
            updateStatus("listening", "Videoyu dinliyor...");
        }
    });

    // Hey Lumo toggle durumunu storage'dan yükle
    chrome.storage.local.get("heyLumoEnabled", (data) => {
        if (data.heyLumoEnabled) {
            heyLumoToggle.checked = true;
            chrome.runtime.sendMessage({ target: "background", type: "enable-wakeword" });
        }
    });

    // Background'dan gelen mesajları dinle
    chrome.runtime.onMessage.addListener((message) => {
        if (message.target && message.target !== TARGET) return;

        switch (message.type) {
            case "mic-recording-started":
                isRecording = true;
                activateBtn.classList.add("recording");
                activateBtn.innerHTML = `
          <div class="recording-pulse"></div>
          Dinliyor... (tıkla = gönder)
        `;
                updateStatus("recording", "Sorunuzu söyleyin...");
                break;

            case "mic-recording-error":
                updateStatus("error", message.error || "Mikrofon açılamadı");
                resetButton();
                break;

            case "question-result":
                handleQuestionResult(message);
                break;

            case "audio-stream-ready":
                playAudio(message.audio_base64, message.audio_format || "mp3");
                break;

            case "wake-activated":
                setActivated(true);
                updateStatus("listening", "Videoyu dinliyor...");
                break;
        }
    });

    activateBtn.addEventListener("click", () => {
        if (!isActivated) {
            activate();
        } else if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });

    heyLumoToggle.addEventListener("change", (e) => {
        const enabled = e.target.checked;
        chrome.storage.local.set({ heyLumoEnabled: enabled });
        if (enabled) {
            chrome.runtime.sendMessage({ target: "background", type: "enable-wakeword" }, (response) => {
                if (response && response.error) {
                    console.error("Wake word error:", response.error);
                    e.target.checked = false;
                    chrome.storage.local.set({ heyLumoEnabled: false });
                }
            });
        } else {
            chrome.runtime.sendMessage({ target: "background", type: "disable-wakeword" });
        }
    });

    deactivateBtn.addEventListener("click", deactivate);
    historyBtn.addEventListener("click", () => console.log("History"));
    settingsBtn.addEventListener("click", () => console.log("Settings"));
});

// ========== Activation ==========

function activate() {
    updateStatus("thinking", "Bağlanıyor...");
    chrome.runtime.sendMessage({ target: "background", type: "activate" }, (response) => {
        if (chrome.runtime.lastError) {
            updateStatus("error", "Bağlantı hatası");
            return;
        }
        if (response && (response.status === "capturing" || response.sessionId)) {
            setActivated(true);
            updateStatus("listening", "Videoyu dinliyor...");
        } else {
            updateStatus("error", response?.error || "Bağlantı hatası");
        }
    });
}

function setActivated(active) {
    isActivated = active;
    if (active) {
        activateBtn.classList.add("active");
        activateBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
      Soru Sor
    `;
        deactivateBtn.style.display = "flex";
    } else {
        isRecording = false;
        activateBtn.classList.remove("active", "recording", "thinking", "speaking");
        activateBtn.innerHTML = `
      Lumo'yu Başlat
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
      </svg>
    `;
        deactivateBtn.style.display = "none";
    }
}

// ========== Mikrofon — content script üzerinden ==========

function deactivate() {
    chrome.runtime.sendMessage({ target: "background", type: "deactivate" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Deactivate error:", chrome.runtime.lastError);
        }
        setActivated(false);
        isRecording = false;
        updateStatus("idle", "");
        const responseEl = document.getElementById("responseText");
        if (responseEl) responseEl.style.display = "none";
    });
}

function startRecording() {
    updateStatus("thinking", "Mikrofon açılıyor...");
    chrome.runtime.sendMessage({ target: "background", type: "start-mic" }, (response) => {
        if (chrome.runtime.lastError) {
            updateStatus("error", "Mikrofon başlatılamadı");
            return;
        }
        if (response && response.error) {
            updateStatus("error", response.error);
        }
        // Başarılı olursa "mic-recording-started" mesajı gelecek
    });
}

function stopRecording() {
    chrome.runtime.sendMessage({ target: "background", type: "stop-mic" });
    isRecording = false;
    updateStatus("thinking", "Düşünüyor...");
    activateBtn.classList.remove("recording");
    activateBtn.classList.add("thinking");
    activateBtn.innerHTML = `
    <div class="thinking-spinner"></div>
    Düşünüyor...
  `;
}

// ========== Soru Sonucu ==========

function handleQuestionResult(result) {
    if (result.error) {
        updateStatus("error", result.error);
        resetButton();
        return;
    }

    // Metin yanıtı geldi — hemen göster
    if (result.ai_response) {
        showResponse(result.ai_response);
        updateStatus("speaking", "Ses hazırlanıyor...");
        activateBtn.classList.remove("thinking");
        activateBtn.classList.add("speaking");
        activateBtn.innerHTML = `
        <div class="speaking-wave"></div>
        Konuşuyor...
      `;
    } else {
        updateStatus("error", "Yanıt alınamadı");
        resetButton();
    }
}

// ========== Ses Oynatma ==========

function playAudio(base64Audio, format = "mp3") {
    activateBtn.classList.remove("thinking");
    activateBtn.classList.add("speaking");
    activateBtn.innerHTML = `
    <div class="speaking-wave"></div>
    Konuşuyor...
  `;
    updateStatus("speaking", "Yanıt veriyor...");

    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const mimeType = format === "mp3" ? "audio/mpeg" : `audio/${format}`;
    const blob = new Blob([bytes], { type: mimeType });
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        updateStatus("listening", "Videoyu dinliyor...");
        resetButton();
    };

    audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        updateStatus("error", "Ses oynatılamadı");
        resetButton();
    };

    audio.play().catch(() => {
        updateStatus("error", "Ses oynatılamadı");
        resetButton();
    });
}

// ========== UI ==========

function updateStatus(state, text) {
    if (!statusIndicator || !statusText) return;
    statusIndicator.className = `status-dot ${state}`;
    statusText.textContent = text;
}

function showResponse(text) {
    const responseEl = document.getElementById("responseText");
    if (responseEl) {
        responseEl.textContent = text;
        responseEl.style.display = "block";
    }
}

function resetButton() {
    isRecording = false;
    activateBtn.classList.remove("recording", "thinking", "speaking");
    setActivated(true);
}
