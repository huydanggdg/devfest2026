/**
 * Hệ thống Âm thanh Procedural (Web Audio API)
 * Tự động tạo hiệu ứng âm thanh hoạt hình vui nhộn & nhạc nền văn phòng mà không cần file MP3 ngoài.
 */
class SoundSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmInterval = null;
        this.bgmStep = 0;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playTone(freq, type = 'sine', duration = 0.15, vol = 0.15, slideFreq = null) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (slideFreq) {
            osc.frequency.exponentialRampToValueAtTime(slideFreq, now + duration);
        }

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    playFaceScanTick() {
        this.playTone(880 + Math.random() * 220, 'sine', 0.06, 0.06);
    }

    playGateSuccess() {
        this.playTone(523.25, 'triangle', 0.12, 0.2);
        setTimeout(() => this.playTone(659.25, 'triangle', 0.12, 0.2), 110);
        setTimeout(() => this.playTone(783.99, 'triangle', 0.14, 0.22), 220);
        setTimeout(() => this.playTone(1046.5, 'triangle', 0.35, 0.25), 340);
    }

    playKeyClack() {
        this.playTone(300 + Math.random() * 400, 'square', 0.03, 0.05);
    }

    playTrapArm() {
        this.playTone(400, 'sawtooth', 0.09, 0.12, 700);
        setTimeout(() => this.playTone(750, 'sine', 0.12, 0.15), 95);
    }

    playPrankTriggered() {
        // Tiếng boing + còi hài hước
        this.playTone(220, 'sawtooth', 0.35, 0.22, 880);
        setTimeout(() => this.playTone(660, 'square', 0.18, 0.18, 990), 150);
        setTimeout(() => this.playTone(990, 'triangle', 0.3, 0.22, 440), 300);
    }

    playBossMeltdown() {
        // Tiếng còi tàu xì khói đầu Sếp
        this.playTone(180, 'sawtooth', 0.5, 0.28, 520);
        setTimeout(() => this.playTone(240, 'sawtooth', 0.6, 0.28, 680), 200);
    }

    playCaughtAlert() {
        this.playTone(600, 'sawtooth', 0.18, 0.25, 220);
        setTimeout(() => this.playTone(450, 'sawtooth', 0.32, 0.25, 150), 190);
    }

    startBGM() {
        if (this.bgmInterval) return;
        const bassline = [130.81, 146.83, 164.81, 196.00, 164.81, 146.83, 130.81, 110.00];
        this.bgmInterval = setInterval(() => {
            if (this.muted) return;
            const note = bassline[this.bgmStep % bassline.length];
            this.playTone(note, 'triangle', 0.18, 0.04);
            this.bgmStep++;
        }, 420);
    }

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }
}

window.GameAudio = new SoundSystem();
