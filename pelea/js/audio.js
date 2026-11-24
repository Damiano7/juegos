// Sonidos sintetizados con WebAudio: no hace falta ningún archivo de audio.
const Sfx = (() => {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, to = null, dur = 0.15, type = 'square', vol = 0.5, delay = 0 }) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.12, vol = 0.5, filter = 1200, type = 'lowpass', delay = 0, sweepTo = null }) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + delay;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filter, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
  }

  return {
    unlock: ensure,
    toggleMute() { muted = !muted; return muted; },
    punch() { noise({ dur: 0.08, vol: 0.6, filter: 900 }); tone({ freq: 160, to: 60, dur: 0.1, type: 'sine', vol: 0.6 }); },
    kick() { noise({ dur: 0.12, vol: 0.7, filter: 700 }); tone({ freq: 120, to: 40, dur: 0.16, type: 'sine', vol: 0.8 }); },
    whoosh() { noise({ dur: 0.14, vol: 0.18, filter: 600, type: 'bandpass', sweepTo: 2400 }); },
    block() { tone({ freq: 900, to: 500, dur: 0.08, type: 'triangle', vol: 0.3 }); noise({ dur: 0.05, vol: 0.3, filter: 3000, type: 'highpass' }); },
    slash() { noise({ dur: 0.18, vol: 0.35, filter: 2500, type: 'highpass', sweepTo: 6000 }); tone({ freq: 1400, to: 700, dur: 0.12, type: 'sawtooth', vol: 0.08 }); },
    web() { noise({ dur: 0.2, vol: 0.3, filter: 1800, type: 'bandpass', sweepTo: 400 }); tone({ freq: 700, to: 300, dur: 0.15, type: 'triangle', vol: 0.15 }); },
    blast() { tone({ freq: 300, to: 1200, dur: 0.2, type: 'sawtooth', vol: 0.18 }); tone({ freq: 600, to: 2000, dur: 0.15, type: 'square', vol: 0.08 }); },
    laser() { tone({ freq: 220, dur: 1.1, type: 'sawtooth', vol: 0.15 }); tone({ freq: 330, to: 340, dur: 1.1, type: 'square', vol: 0.08 }); },
    shield() { tone({ freq: 500, to: 250, dur: 0.3, type: 'triangle', vol: 0.25 }); noise({ dur: 0.25, vol: 0.15, filter: 1500, type: 'bandpass' }); },
    boom() { noise({ dur: 0.5, vol: 0.9, filter: 500, sweepTo: 60 }); tone({ freq: 90, to: 30, dur: 0.5, type: 'sine', vol: 0.9 }); },
    jet() { noise({ dur: 0.1, vol: 0.12, filter: 400, type: 'lowpass' }); },
    jump() { tone({ freq: 300, to: 600, dur: 0.1, type: 'square', vol: 0.08 }); },
    super() { tone({ freq: 200, to: 1600, dur: 0.45, type: 'sawtooth', vol: 0.2 }); tone({ freq: 400, to: 2400, dur: 0.45, type: 'square', vol: 0.08, delay: 0.05 }); },
    ready() { tone({ freq: 880, dur: 0.08, type: 'square', vol: 0.12 }); tone({ freq: 1320, dur: 0.12, type: 'square', vol: 0.12, delay: 0.08 }); },
    ko() { tone({ freq: 400, to: 60, dur: 0.9, type: 'sawtooth', vol: 0.3 }); noise({ dur: 0.6, vol: 0.6, filter: 800, sweepTo: 80 }); },
    select() { tone({ freq: 660, dur: 0.06, type: 'square', vol: 0.12 }); },
    confirm() { tone({ freq: 523, dur: 0.08, type: 'square', vol: 0.15 }); tone({ freq: 784, dur: 0.14, type: 'square', vol: 0.15, delay: 0.08 }); },
    bell() { tone({ freq: 1046, dur: 0.6, type: 'triangle', vol: 0.3 }); tone({ freq: 1568, dur: 0.5, type: 'sine', vol: 0.15 }); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'square', vol: 0.15, delay: i * 0.12 })); },
  };
})();
