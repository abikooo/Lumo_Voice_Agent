document.addEventListener('DOMContentLoaded', () => {
    const requestMicBtn = document.getElementById('requestMicBtn');
    const micStatus = document.getElementById('micStatus');

    requestMicBtn.addEventListener('click', async () => {
        try {
            micStatus.textContent = "İzin isteniyor...";
            micStatus.className = "status";

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Success
            micStatus.textContent = "✅ İzin başarıyla verildi! Artık popup üzerinden LumoAI'yi kullanabilirsiniz.";
            micStatus.className = "status success";

            // Clean up
            stream.getTracks().forEach(t => t.stop());

        } catch (error) {
            console.error("Permission error:", error);
            micStatus.textContent = "❌ İzin reddedildi: " + error.message;
            micStatus.className = "status error";
        }
    });

    // Check initial status
    checkPermission();

    async function checkPermission() {
        try {
            // Permissions API check
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
            if (permissionStatus.state === 'granted') {
                micStatus.textContent = "✅ İzin zaten verilmiş.";
                micStatus.className = "status success";
            }
        } catch (e) {
            // Ignore if API not supported
        }
    }
});
