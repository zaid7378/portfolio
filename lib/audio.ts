// Tiny synthesized sound engine — no audio files needed.
// A low ambient drone plus short UI ticks, all generated with Web Audio.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drone: GainNode | null = null;
  enabled = true;

  private ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    // Ambient drone: detuned saws through a slowly breathing low-pass.
    const drone = ctx.createGain();
    drone.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    filter.Q.value = 6;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    [55, 55.4, 82.4, 110.3].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? "sawtooth" : "triangle";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i < 2 ? 0.05 : 0.02;
      o.connect(g).connect(filter);
      o.start();
    });
    filter.connect(drone).connect(master);

    this.ctx = ctx;
    this.master = master;
    this.drone = drone;
    return ctx;
  }

  /** Must be called from a user gesture the first time. */
  start() {
    const ctx = this.ensure();
    if (!ctx || !this.drone) return;
    ctx.resume();
    if (this.enabled) this.drone.gain.setTargetAtTime(0.35, ctx.currentTime, 1.2);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!this.ctx || !this.drone) {
      if (on) this.start();
      return;
    }
    this.ctx.resume();
    this.drone.gain.setTargetAtTime(on ? 0.35 : 0, this.ctx.currentTime, on ? 0.8 : 0.25);
  }

  tick(freq = 1800, dur = 0.05, vol = 0.06) {
    if (!this.enabled || !this.ctx || !this.master || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  whoosh() {
    if (!this.enabled || !this.ctx || !this.master || this.ctx.state !== "running") return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const len = 0.9;
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(200, t);
    f.frequency.exponentialRampToValueAtTime(3200, t + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }
}

export const sound = typeof window !== "undefined" ? new SoundEngine() : (null as unknown as SoundEngine);
