// Procedural Web Audio API sound effects (zero external audio files)

class SoundFX {
  private ctx: AudioContext | null = null;
  private muted = false;

  setMuted(m: boolean) {
    this.muted = m;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private getCtx(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.14,
    delay = 0,
    endFreq?: number
  ) {
    const ctx = this.getCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  click() {
    this.tone(520, 0.055, 'triangle', 0.1, 0, 680);
  }

  snap() {
    this.tone(440, 0.06, 'sine', 0.12, 0, 620);
  }

  delete() {
    this.tone(360, 0.07, 'triangle', 0.09, 0, 220);
  }

  step() {
    this.tone(290, 0.08, 'triangle', 0.11, 0, 380);
  }

  turn() {
    this.tone(340, 0.09, 'sine', 0.09, 0, 440);
  }

  gem(combo = 0) {
    const base = 587.33 * Math.pow(1.06, Math.min(combo, 6)); // D5 ascending
    this.tone(base, 0.14, 'sine', 0.15, 0);
    this.tone(base * 1.5, 0.22, 'triangle', 0.13, 0.07);
  }

  bonusGem() {
    const notes = [659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, i) => {
      this.tone(n, 0.18, 'triangle', 0.14, i * 0.055);
    });
  }

  unlock() {
    this.tone(330, 0.09, 'square', 0.08, 0);
    this.tone(493.88, 0.12, 'triangle', 0.12, 0.08);
    this.tone(659.25, 0.2, 'sine', 0.14, 0.16);
  }

  bump() {
    this.tone(170, 0.16, 'sawtooth', 0.13, 0, 95);
    this.tone(125, 0.18, 'square', 0.09, 0.07, 75);
  }

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.tone(n, i === 3 ? 0.45 : 0.16, 'triangle', 0.15, i * 0.09);
    });
  }

  quizCorrect() {
    this.tone(587.33, 0.12, 'sine', 0.14, 0);
    this.tone(880, 0.24, 'triangle', 0.15, 0.09);
  }

  quizWrong() {
    this.tone(240, 0.18, 'sawtooth', 0.09, 0, 180);
  }
}

export const soundFX = new SoundFX();
