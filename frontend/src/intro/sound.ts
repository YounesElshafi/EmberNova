// Synthesized sound for the introduction: a low ambient drone and a two-tone caution alarm.
// No audio files are downloaded. Nothing plays until the visitor turns sound on.
export class IntroSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private alarmTimer: number | null = null;

  start() {
    if (this.ctx) {
      void this.ctx.resume();
      this.master!.gain.setTargetAtTime(0.55, this.ctx.currentTime, 0.4);
      return;
    }
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.setTargetAtTime(0.55, ctx.currentTime, 0.8);
    master.connect(ctx.destination);
    this.master = master;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 240;
    filter.connect(master);
    for (const [f, g] of [[55, 0.16], [55.4, 0.14], [82.4, 0.06]] as const) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const gain = ctx.createGain();
      gain.gain.value = g;
      o.connect(gain).connect(filter);
      o.start();
    }
  }

  stop() {
    this.alarm(false);
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }

  alarm(on: boolean) {
    if (!on || !this.ctx) {
      if (this.alarmTimer) window.clearInterval(this.alarmTimer);
      this.alarmTimer = null;
      return;
    }
    if (this.alarmTimer) return;
    const beep = (freq: number, at: number) => {
      const ctx = this.ctx!;
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.05, at + 0.01);
      g.gain.setValueAtTime(0.05, at + 0.2);
      g.gain.linearRampToValueAtTime(0, at + 0.23);
      o.connect(g).connect(this.master!);
      o.start(at);
      o.stop(at + 0.25);
    };
    const cycle = () => {
      const t = this.ctx!.currentTime;
      beep(1040, t);
      beep(780, t + 0.28);
    };
    cycle();
    this.alarmTimer = window.setInterval(cycle, 900);
  }

  dispose() {
    this.alarm(false);
    void this.ctx?.close();
    this.ctx = null;
  }
}
