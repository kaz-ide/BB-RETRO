class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initialized = false;

    // Continuous Rotor Engine nodes
    this.rotorOsc = null;
    this.rotorGain = null;
    this.lfoOsc = null;
    this.lfoGain = null;
    this.masterGain = null;
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master gain node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);

      // Set up Helicopter Rotor sound synthesizer
      this.setupRotorEngine();

      this.initialized = true;
      console.log("Web Audio Engine Initialized");
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }

  setupRotorEngine() {
    if (!this.ctx) return;

    // Carrier frequency oscillator (low engine throb)
    this.rotorOsc = this.ctx.createOscillator();
    this.rotorOsc.type = 'sine';
    this.rotorOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // 55Hz base

    // Rotor gain node
    this.rotorGain = this.ctx.createGain();
    this.rotorGain.gain.setValueAtTime(0, this.ctx.currentTime);

    // LFO for rotor blade chop effect ("whump-whump")
    this.lfoOsc = this.ctx.createOscillator();
    this.lfoOsc.type = 'sawtooth';
    this.lfoOsc.frequency.setValueAtTime(14, this.ctx.currentTime); // 14 chops per sec

    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    // Connect LFO to rotor gain modulation
    this.lfoOsc.connect(this.lfoGain);
    this.lfoGain.connect(this.rotorGain.gain);

    // Connect rotor to master
    this.rotorOsc.connect(this.rotorGain);
    this.rotorGain.connect(this.masterGain);

    this.rotorOsc.start();
    this.lfoOsc.start();
  }

  updateRotorSound(speedRatio, isFlying) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    if (!isFlying) {
      // Idle engine sound on ground
      this.rotorOsc.frequency.setTargetAtTime(45, now, 0.1);
      this.lfoOsc.frequency.setTargetAtTime(8, now, 0.1);
      this.lfoGain.gain.setTargetAtTime(0.1, now, 0.1);
    } else {
      // Modulate frequency with velocity
      const freq = 55 + speedRatio * 35;
      const chopRate = 14 + speedRatio * 10;
      const vol = 0.2 + speedRatio * 0.15;

      this.rotorOsc.frequency.setTargetAtTime(freq, now, 0.1);
      this.lfoOsc.frequency.setTargetAtTime(chopRate, now, 0.1);
      this.lfoGain.gain.setTargetAtTime(vol, now, 0.1);
    }
  }

  playGunSound() {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playBombReleaseSound() {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playExplosionSound() {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Create noise buffer for deep explosion
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  playRefuelChime() {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.1, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.15);
    });
  }

  playSirenAlarm() {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.5);
    osc.frequency.linearRampToValueAtTime(440, now + 1.0);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.0);
  }

  playVictoryFanfare() {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const melody = [
      { note: 523.25, duration: 0.15 },
      { note: 523.25, duration: 0.15 },
      { note: 523.25, duration: 0.15 },
      { note: 659.25, duration: 0.4 },
      { note: 783.99, duration: 0.6 }
    ];

    let t = now;
    melody.forEach(item => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(item.note, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + item.duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + item.duration);

      t += item.duration;
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
    }
    return this.isMuted;
  }
}
