window.chatNotifications = (function () {
    let audioContext;

    function getAudioContext() {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) {
            return null;
        }

        if (!audioContext) {
            audioContext = new AudioContextCtor();
        }

        return audioContext;
    }

    async function playMessageAlert() {
        const context = getAudioContext();
        if (!context) {
            return;
        }

        if (context.state === "suspended") {
            try {
                await context.resume();
            }
            catch {
                return;
            }
        }

        const now = context.currentTime;
        const gain = context.createGain();
        gain.connect(context.destination);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.21, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

        const firstTone = context.createOscillator();
        firstTone.type = "sine";
        firstTone.frequency.setValueAtTime(880, now);
        firstTone.connect(gain);
        firstTone.start(now);
        firstTone.stop(now + 0.1);

        const secondTone = context.createOscillator();
        secondTone.type = "sine";
        secondTone.frequency.setValueAtTime(1175, now + 0.09);
        secondTone.connect(gain);
        secondTone.start(now + 0.09);
        secondTone.stop(now + 0.2);
    }

    return {
        playMessageAlert
    };
})();
