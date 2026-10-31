const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const html = document.documentElement;
const localPreview = location.protocol === "file:"
  || location.hostname === "localhost"
  || location.hostname === "127.0.0.1";

// Inline helpers keep the page functional when index.html is opened directly from disk.
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scrollToNodePosition(scrollLeft, scrollWidth, clientWidth, nodeCount) {
  if (nodeCount <= 1) return 0;
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  if (maxScroll === 0) return 0;
  return clamp(scrollLeft / maxScroll, 0, 1) * (nodeCount - 1);
}

function nodeToScrollPosition(nodeIndex, scrollWidth, clientWidth, nodeCount) {
  if (nodeCount <= 1) return 0;
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  return (clamp(nodeIndex, 0, nodeCount - 1) / (nodeCount - 1)) * maxScroll;
}

function cleanText(value, maxLength) {
  return Array.from(String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim())
    .slice(0, maxLength)
    .join("");
}

function validateMessage(payload = {}) {
  if (cleanText(payload.website, 20)) {
    return { ok: false, error: "留言没有发出，请刷新页面后重试。" };
  }

  const message = cleanText(payload.message, 61);
  const name = cleanText(payload.name, 17);

  if (!message) return { ok: false, error: "写下一句话，再点亮星火。" };
  if (Array.from(message).length > 60) return { ok: false, error: "留言最多 60 个字。" };
  if (Array.from(name).length > 16) return { ok: false, error: "称呼最多 16 个字。" };

  return {
    ok: true,
    value: {
      name: name || "一位后来者",
      message,
    },
  };
}

const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 6_500) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

/* =========================================================
   Theme
   ========================================================= */
const themeToggle = $("#theme-toggle");
const themeMeta = $('meta[name="theme-color"]');
const themeLabel = $(".tool-label", themeToggle);

function applyTheme(theme, announce = false) {
  html.dataset.theme = theme;
  const isLight = theme === "light";
  themeToggle.setAttribute("aria-pressed", String(isLight));
  themeToggle.setAttribute("aria-label", isLight ? "切换到深色主题" : "切换到浅色主题");
  themeLabel.textContent = isLight ? "转深色" : "转浅色";
  themeMeta.setAttribute("content", isLight ? "#eee4d3" : "#0d0b0a");
  if (announce) showToast(isLight ? "已切换到浅色主题" : "已切换到深色主题");
}

const savedTheme = storage.get("longmarch-theme");
applyTheme(savedTheme === "light" ? "light" : "dark");

themeToggle.addEventListener("click", () => {
  const nextTheme = html.dataset.theme === "light" ? "dark" : "light";
  applyTheme(nextTheme, true);
  storage.set("longmarch-theme", nextTheme);
});

/* =========================================================
   Procedural soundscape
   ========================================================= */
const chordVoicings = {
  Dm: [57, 62, 65],
  Bb: [58, 62, 65],
  Gm: [55, 58, 62],
  A: [57, 61, 64],
  F: [57, 60, 65],
  C: [55, 60, 64],
  Bbmaj7: [58, 62, 65, 69],
  Gm7: [55, 58, 62, 65],
};

const musicThemes = {
  cover: {
    tempo: 58,
    wave: "sine",
    timbre: "flute",
    noteGain: 0.055,
    noteLength: 1.5,
    melodyOffsetMs: -4,
    filter: "lowpass",
    frequency: 520,
    textureGain: 0.035,
    melody: [62, null, 65, 69, 67, null, 65, null, 62, null, 69, 72, 69, 67, 65, null],
    bass: [38, null, null, null, 41, null, null, null, 38, null, null, null, 45, null, null, null],
    drums: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    chords: [chordVoicings.Dm, chordVoicings.Bb, chordVoicings.F, chordVoicings.C],
    breathSteps: [6, 7],
    breathEvery: 3,
  },
  ruijin: {
    tempo: 78,
    wave: "triangle",
    timbre: "flute",
    noteGain: 0.06,
    noteLength: 0.9,
    melodyOffsetMs: 0,
    filter: "lowpass",
    frequency: 390,
    textureGain: 0.065,
    melody: [62, 65, 69, 67, 65, 69, 72, null, 62, 65, 69, 72, 69, 67, 65, null],
    bass: [38, null, 45, null, 41, null, 45, null, 38, null, 43, null, 45, null, 45, null],
    drums: [2, 0, 1, 0, 2, 0, 1, 1, 2, 0, 1, 0, 2, 0, 1, 2],
    chords: [chordVoicings.Dm, chordVoicings.Bb, chordVoicings.F, chordVoicings.A],
    breathSteps: [5, 6, 7],
    breathEvery: 3,
  },
  xiangjiang: {
    tempo: 46,
    wave: "sine",
    timbre: "bell",
    noteGain: 0.046,
    noteLength: 2.2,
    melodyOffsetMs: -16,
    filter: "bandpass",
    frequency: 680,
    textureGain: 0.075,
    melody: [69, null, 65, 62, null, 53, null, 57, 69, null, 65, null, 62, null, null, null],
    bass: [38, null, null, null, 41, null, null, null, 38, null, null, null, 33, null, null, null],
    drums: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    chords: [chordVoicings.Dm, chordVoicings.Bbmaj7, chordVoicings.Gm, chordVoicings.A],
    breathSteps: [8, 9, 10, 11, 12, 13, 14, 15],
    breathEvery: 2,
  },
  zunyi: {
    tempo: 64,
    wave: "triangle",
    timbre: "pluck",
    noteGain: 0.06,
    noteLength: 0.75,
    melodyOffsetMs: -6,
    filter: "lowpass",
    frequency: 850,
    textureGain: 0.022,
    melody: [62, null, 65, null, 69, 67, null, 65, 62, null, 69, null, 65, null, 62, null],
    bass: [38, null, null, null, 41, null, null, null, 45, null, null, null, 38, null, null, null],
    drums: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    chords: [chordVoicings.Bb, chordVoicings.F, chordVoicings.Gm7, chordVoicings.A],
    breathSteps: [12, 13, 14, 15],
    breathEvery: 3,
  },
  chishui: {
    tempo: 112,
    wave: "triangle",
    timbre: "pluck",
    noteGain: 0.052,
    noteLength: 0.42,
    melodyOffsetMs: -14,
    filter: "bandpass",
    frequency: 1050,
    textureGain: 0.045,
    melody: [62, 65, 69, 67, 65, 69, 72, 69, 74, 72, 69, 67, 65, 62, 65, null],
    bass: [38, null, 45, null, 41, null, 45, null, 38, null, 43, null, 45, null, 45, null],
    drums: [2, 0, 1, 0, 2, 0, 1, 1, 2, 0, 1, 0, 2, 0, 1, 2],
    chords: [chordVoicings.Dm, chordVoicings.Bb, chordVoicings.C, chordVoicings.A],
    breathSteps: [13, 14],
    breathEvery: 4,
  },
  jiajin: {
    tempo: 52,
    wave: "sine",
    timbre: "bell",
    noteGain: 0.05,
    noteLength: 1.8,
    melodyOffsetMs: 8,
    filter: "highpass",
    frequency: 340,
    textureGain: 0.085,
    melody: [74, null, 77, null, 81, 79, null, 77, 74, null, 77, null, 81, null, 79, null],
    bass: [45, null, null, null, 43, null, null, null, 38, null, null, null, 45, null, null, null],
    drums: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    chords: [chordVoicings.Bbmaj7, chordVoicings.Gm, chordVoicings.Dm, chordVoicings.A],
    breathSteps: [8, 9, 10, 11, 12, 13, 14, 15],
    breathEvery: 2,
  },
  grassland: {
    tempo: 44,
    wave: "sine",
    timbre: "flute",
    noteGain: 0.044,
    noteLength: 2.3,
    melodyOffsetMs: -18,
    filter: "lowpass",
    frequency: 330,
    textureGain: 0.075,
    melody: [57, null, 60, null, 62, 60, null, 55, 57, null, 60, null, 62, null, 60, null],
    bass: [33, null, null, null, 36, null, null, null, 33, null, null, null, 38, null, null, null],
    drums: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    chords: [chordVoicings.Dm, chordVoicings.Bb, chordVoicings.Gm, chordVoicings.A],
    breathSteps: [8, 9, 10, 11, 12, 13, 14, 15],
    breathEvery: 2,
  },
  wuqi: {
    tempo: 82,
    wave: "sawtooth",
    timbre: "brass",
    noteGain: 0.03,
    noteLength: 1.1,
    melodyOffsetMs: 0,
    filter: "lowpass",
    frequency: 1250,
    textureGain: 0.04,
    melody: [62, 65, 69, 72, 74, 72, 69, 67, 65, 69, 72, 74, 72, 69, 67, null],
    bass: [41, null, 36, null, 38, null, 43, null, 41, null, 36, null, 43, null, 45, null],
    drums: [2, 0, 1, 0, 2, 0, 1, 2, 2, 0, 1, 0, 2, 1, 1, 2],
    chords: [chordVoicings.F, chordVoicings.C, chordVoicings.Dm, chordVoicings.Bb],
    breathSteps: [14, 15],
    breathEvery: 4,
  },
  figures: {
    tempo: 68,
    wave: "triangle",
    timbre: "pluck",
    noteGain: 0.055,
    noteLength: 1.05,
    melodyOffsetMs: 6,
    filter: "lowpass",
    frequency: 760,
    textureGain: 0.018,
    melody: [62, null, 65, 69, 67, null, 62, null, 62, null, 69, 72, 69, null, 67, null],
    bass: [38, null, null, null, 41, null, null, null, 45, null, null, null, 38, null, null, null],
    drums: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    chords: [chordVoicings.Dm, chordVoicings.Bb, chordVoicings.F, chordVoicings.C],
    breathSteps: [12, 13, 14, 15],
    breathEvery: 3,
  },
  spark: {
    tempo: 84,
    wave: "sine",
    timbre: "bell",
    noteGain: 0.045,
    noteLength: 1.1,
    melodyOffsetMs: -8,
    filter: "highpass",
    frequency: 520,
    textureGain: 0.012,
    melody: [74, null, 77, 81, 79, null, 77, null, 74, null, 81, 84, 81, 79, 77, null],
    bass: [41, null, null, null, 36, null, null, null, 38, null, null, null, 43, null, null, null],
    drums: [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
    chords: [chordVoicings.F, chordVoicings.C, chordVoicings.Dm, chordVoicings.Bb],
    breathSteps: [12, 13, 14, 15],
    breathEvery: 4,
  },
  finale: {
    tempo: 72,
    wave: "sawtooth",
    timbre: "brass",
    noteGain: 0.034,
    noteLength: 1.6,
    melodyOffsetMs: 0,
    filter: "lowpass",
    frequency: 1450,
    textureGain: 0.028,
    melody: [62, 65, 69, 74, 77, 74, 69, 67, 65, 69, 72, 77, 74, 69, 67, 65],
    bass: [38, null, 41, null, 45, null, 43, null, 41, null, 36, null, 38, null, 45, null],
    drums: [2, 0, 1, 0, 2, 0, 1, 2, 2, 0, 1, 0, 2, 1, 1, 2],
    chords: [chordVoicings.Dm, chordVoicings.Bb, chordVoicings.F, chordVoicings.A],
    breathSteps: [14, 15],
    breathEvery: 4,
  },
};

const journeyMusicThemes = ["ruijin", "xiangjiang", "zunyi", "chishui", "jiajin", "grassland", "wuqi"];
const musicThemeLabels = {
  cover: "启程",
  ruijin: "于都河",
  xiangjiang: "湘江夜行",
  zunyi: "遵义灯下",
  chishui: "四渡急行",
  jiajin: "夹金风雪",
  grassland: "草地迷雾",
  wuqi: "陕北会师",
  figures: "人物叙事",
  spark: "星火留言",
  finale: "薪火终章",
};

class Soundscape {
  constructor() {
    this.context = null;
    this.master = null;
    this.limiter = null;
    this.filter = null;
    this.noiseGain = null;
    this.noiseBuffer = null;
    this.enabled = false;
    this.sceneIndex = 0;
    this.crackleTimer = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.nextNoteTime = 0;
    this.themeName = "cover";
  }

  async start() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("AUDIO_UNSUPPORTED");

    if (!this.context) {
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.limiter = this.context.createDynamicsCompressor();
      this.limiter.threshold.value = -20;
      this.limiter.knee.value = 12;
      this.limiter.ratio.value = 5;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.28;
      this.filter = this.context.createBiquadFilter();
      this.noiseGain = this.context.createGain();
      this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
      const samples = this.noiseBuffer.getChannelData(0);

      let previous = 0;
      for (let index = 0; index < samples.length; index += 1) {
        const white = Math.random() * 2 - 1;
        previous = previous * 0.94 + white * 0.06;
        samples[index] = previous;
      }

      const source = this.context.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      source.connect(this.filter);
      this.filter.connect(this.noiseGain);
      this.noiseGain.connect(this.master);
      this.master.connect(this.limiter);
      this.limiter.connect(this.context.destination);
      source.start();

      this.master.gain.value = 0;
      this.crackleTimer = window.setInterval(() => this.playCrackle(), 470);
    }

    await this.context.resume();
    if (this.context.state !== "running") throw new Error("AUDIO_BLOCKED");
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setValueAtTime(this.master.gain.value, this.context.currentTime);
    this.master.gain.linearRampToValueAtTime(0.45, this.context.currentTime + 0.8);
    this.enabled = true;
    this.setTheme(this.themeName, false);
    this.startMusic();
    this.playHorn(0.9);
  }

  stop() {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + 0.35);
    this.enabled = false;
    window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  setScene(index, allowCue = true) {
    const previousScene = this.sceneIndex;
    this.sceneIndex = index;
    this.setTheme(journeyMusicThemes[index] || "ruijin", false);
    if (allowCue && this.enabled && previousScene !== index && (index === 0 || index === 6)) {
      this.playHorn(index === 6 ? 1 : 0.78);
    }
  }

  setTheme(name, allowCue = false) {
    const theme = musicThemes[name] || musicThemes.cover;
    const changed = this.themeName !== name;
    this.themeName = name;
    if (!this.context || !this.filter) return;
    const now = this.context.currentTime;
    this.filter.type = theme.filter;
    this.filter.Q.setTargetAtTime(0.55, now, 0.15);
    this.filter.frequency.setTargetAtTime(theme.frequency, now, 0.35);
    this.noiseGain.gain.setTargetAtTime(theme.textureGain, now, 0.35);
    soundToggle.dataset.track = name;
    soundToggle.title = `当前配乐：${musicThemeLabels[name] || "远征"}`;
    if (changed) {
      this.musicStep = 0;
      this.nextNoteTime = now + 0.06;
    }
    if (allowCue && this.enabled) this.playHorn(name === "finale" || name === "wuqi" ? 0.82 : 0.56);
  }

  startMusic() {
    window.clearInterval(this.musicTimer);
    this.musicStep = 0;
    this.nextNoteTime = this.context.currentTime + 0.06;
    this.scheduleMusic();
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 120);
  }

  scheduleMusic() {
    if (!this.enabled || !this.context || document.hidden) return;
    const theme = musicThemes[this.themeName] || musicThemes.cover;
    const stepDuration = 30 / theme.tempo;
    if (this.nextNoteTime < this.context.currentTime - 0.5) this.nextNoteTime = this.context.currentTime + 0.04;
    while (this.nextNoteTime < this.context.currentTime + 0.22) {
      const step = this.musicStep % theme.melody.length;
      const cycle = Math.floor(this.musicStep / theme.melody.length);
      const melody = theme.melody[step];
      const bass = theme.bass[step];
      const breathActive =
        cycle > 0 &&
        theme.breathEvery &&
        cycle % theme.breathEvery === theme.breathEvery - 1 &&
        theme.breathSteps.includes(step);
      if (step % 4 === 0 && theme.chords) this.playPad(theme.chords[(step / 4) % theme.chords.length], this.nextNoteTime + 0.018, stepDuration * 3.7);
      if (!breathActive && Number.isFinite(melody)) {
        this.playMusicNote(melody, this.nextNoteTime + theme.melodyOffsetMs / 1000, theme);
      }
      if (!breathActive && Number.isFinite(bass)) this.playBass(bass, this.nextNoteTime, stepDuration * 3.2);
      if (!breathActive && theme.drums[step]) this.playDrum(this.nextNoteTime, theme.drums[step]);
      this.musicStep += 1;
      this.nextNoteTime += stepDuration;
    }
  }

  playMusicNote(midi, time, theme) {
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const duration = theme.noteLength;
    const attack = theme.timbre === "pluck" || theme.timbre === "bell" ? 0.012 : 0.14;
    oscillator.type = theme.wave;
    oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), time);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(theme.timbre === "brass" ? 1900 : 3200, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(theme.noteGain, time + attack);
    if (theme.timbre === "pluck" || theme.timbre === "bell") {
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    } else {
      gain.gain.setValueAtTime(theme.noteGain, time + duration * 0.62);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    }
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.05);
    if (theme.timbre === "bell" || theme.timbre === "pluck") {
      const overtone = this.context.createOscillator();
      const overtoneGain = this.context.createGain();
      overtone.type = "sine";
      overtone.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12) * 2.01, time);
      overtoneGain.gain.setValueAtTime(0.0001, time);
      overtoneGain.gain.linearRampToValueAtTime(theme.noteGain * 0.26, time + attack);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.7);
      overtone.connect(overtoneGain);
      overtoneGain.connect(this.master);
      overtone.start(time);
      overtone.stop(time + duration * 0.72);
    }
  }

  playBass(midi, time, duration) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.032, time + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.04);
  }

  playPad(chord, time, duration) {
    chord.forEach((midi, index) => {
      const oscillator = this.context.createOscillator();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      const pan = this.context.createStereoPanner();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.detune.value = (index - (chord.length - 1) / 2) * 3.5;
      oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), time);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(980, time);
      pan.pan.value = (index - (chord.length - 1) / 2) * 0.22;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.012, time + 0.32);
      gain.gain.setValueAtTime(0.009, time + Math.max(0.34, duration - 0.45));
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(pan);
      pan.connect(this.master);
      oscillator.start(time);
      oscillator.stop(time + duration + 0.05);
    });
  }

  playDrum(time, accent) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(accent === 2 ? 92 : 74, time);
    oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.2);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(accent === 2 ? 0.095 : 0.055, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + (accent === 2 ? 0.3 : 0.2));
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + 0.34);
  }

  playHorn(strength) {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    const gain = this.context.createGain();
    const low = this.context.createOscillator();
    const high = this.context.createOscillator();
    low.type = "triangle";
    high.type = "sine";
    low.frequency.setValueAtTime(98, now);
    high.frequency.setValueAtTime(147, now);
    low.frequency.linearRampToValueAtTime(116, now + 1.1);
    high.frequency.linearRampToValueAtTime(174, now + 1.1);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06 * strength, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);
    low.connect(gain);
    high.connect(gain);
    gain.connect(this.master);
    low.start(now);
    high.start(now);
    low.stop(now + 1.8);
    high.stop(now + 1.8);
  }

  playCrackle() {
    if (!this.enabled || this.themeName !== "ruijin" || !this.context || Math.random() > 0.7) return;
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = 1500 + Math.random() * 1500;
    gain.gain.setValueAtTime(0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now, Math.random(), 0.06);
  }
}

const soundscape = new Soundscape();
const soundToggle = $("#sound-toggle");
const audioStatus = $("#audio-status");
const soundLabel = $(".tool-label", soundToggle);
let soundStarting = false;
let soundPreference = storage.get("longmarch-sound");

function setSoundUi(enabled) {
  soundToggle.setAttribute("aria-pressed", String(enabled));
  soundToggle.setAttribute("aria-label", enabled ? "关闭配乐" : "开启配乐");
  soundLabel.textContent = enabled ? "关配乐" : "开配乐";
}

setSoundUi(false);

async function enableSound(automatic = false) {
  if (soundscape.enabled || soundStarting) return;
  soundStarting = true;
  soundToggle.disabled = true;
  try {
    await soundscape.start();
    setSoundUi(true);
    soundPreference = "on";
    storage.set("longmarch-sound", "on");
    audioStatus.textContent = "配乐已开启，会随页面主题切换不同旋律。";
    showToast(automatic ? "配乐已开启，可在右上角关闭" : "配乐已开启");
  } catch (error) {
    if (error.message === "AUDIO_UNSUPPORTED") {
      soundToggle.disabled = true;
      soundToggle.setAttribute("aria-label", "当前浏览器不支持配乐");
      soundLabel.textContent = "配乐不可用";
      audioStatus.textContent = "当前浏览器不支持配乐，全部内容仍可正常使用。";
      showToast("当前浏览器不支持配乐");
    } else {
      soundToggle.disabled = false;
      setSoundUi(false);
      audioStatus.textContent = "浏览器拦截了自动播放，请点击右上角“开配乐”。";
      showToast("请点击右上角“开配乐”启用配乐");
    }
  } finally {
    if (soundToggle.getAttribute("aria-label") !== "当前浏览器不支持配乐") soundToggle.disabled = false;
    soundStarting = false;
  }
}

function disableSound() {
  soundscape.stop();
  setSoundUi(false);
  soundPreference = "off";
  storage.set("longmarch-sound", "off");
  audioStatus.textContent = "配乐已关闭。";
  showToast("配乐已关闭");
}

soundToggle.addEventListener("click", () => {
  if (soundscape.enabled) disableSound();
  else enableSound();
});

soundscape.setTheme("cover", false);

function autoStartSound(event) {
  if (soundPreference === "off" || soundscape.enabled || soundStarting) return;
  if (event.target.closest?.("#sound-toggle")) return;
  void enableSound(true);
}

window.addEventListener("pointerdown", autoStartSound, { capture: true, passive: true });
window.addEventListener("wheel", autoStartSound, { capture: true, passive: true });
window.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter" || event.key === " ") autoStartSound(event);
  },
  { capture: true },
);

/* =========================================================
   Header state
   ========================================================= */
const siteHeader = $(".site-header");
let headerFrame = 0;

function updateHeader() {
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 22);
  headerFrame = 0;
}

window.addEventListener(
  "scroll",
  () => {
    if (!headerFrame) headerFrame = requestAnimationFrame(updateHeader);
  },
  { passive: true },
);
updateHeader();

/* =========================================================
   Horizontal journey
   ========================================================= */
const scroller = $("#march-scroller");
const panels = $$(".scene-panel", scroller);
const worldLayers = $$(".world-layer");
const starRail = $(".star-rail");
const starNodes = $$(".star-node");
const weatherField = $("#weather-field");
const sceneNumber = $("#scene-number");
const progressFill = $("#progress-fill");
const journeyPlace = $("#journey-place");
const prevButton = $("#prev-scene");
const nextButton = $("#next-scene");
const nodeCount = panels.length;
const sceneLabels = ["第一程", "第二程", "第三程", "第四程", "第五程", "第六程", "第七程"];
const placeNames = [
  "瑞金 · 于都河",
  "湘江 · 兴安界首",
  "遵义 · 老城",
  "赤水河 · 川黔滇边",
  "夹金山 · 雪线",
  "松潘草地",
  "吴起镇 · 陕北",
];

let currentIndex = 0;
let maxVisited = 0;
let scrollFrame = 0;
let journeyEngaged = false;
let musicRegion = "cover";
const initialParams = new URLSearchParams(location.search);
const hasChapterParam = initialParams.has("chapter");
const initialChapter = clamp(Number.parseInt(initialParams.get("chapter") || "1", 10) || 1, 1, nodeCount) - 1;

function syncJourneyUrl(index) {
  if (!journeyEngaged || location.protocol === "file:") return;
  const nextUrl = new URL(location.href);
  nextUrl.searchParams.set("chapter", String(index + 1));
  nextUrl.hash = "journey";
  history.replaceState(null, "", nextUrl);
}

function engageJourney() {
  journeyEngaged = true;
  syncJourneyUrl(currentIndex);
}

function setWeather(index) {
  weatherField.replaceChildren();
  if (reduceMotion.matches) return;

  const definitions = [
    [{ type: "ash", count: 13 }, { type: "mote", count: 5 }],
    [
      { type: "rain", count: 22 },
      { type: "fog", count: 2 },
      { type: "glint", count: 11, yMin: 62, yMax: 94 },
      { type: "ripple", count: 8, yMin: 68, yMax: 94 },
    ],
    [{ type: "ash", count: 8 }, { type: "mote", count: 5 }],
    [
      { type: "rain", count: 28 },
      { type: "fog", count: 2 },
      { type: "glint", count: 9, xMin: 34, xMax: 71, yMin: 48, yMax: 94 },
      { type: "ripple", count: 7, xMin: 36, xMax: 69, yMin: 62, yMax: 92 },
    ],
    [
      { type: "snow", count: 24 },
      { type: "snow-close", count: 12 },
      { type: "fog", count: 2 },
      { type: "mote", count: 4, yMin: 18, yMax: 72 },
    ],
    [
      { type: "fog", count: 8 },
      { type: "mote", count: 12, yMin: 30, yMax: 94 },
      { type: "wind", count: 7, yMin: 46, yMax: 86 },
    ],
    [{ type: "ash", count: 24 }, { type: "mote", count: 7 }],
  ];
  const sceneDefinitions = definitions[index] || [];
  const width = window.innerWidth;
  const densityScale = width < 560 ? 0.45 : width < 900 ? 0.65 : width < 1280 ? 0.82 : 1;
  const profiles = {
    ash: { duration: [7, 15], size: [1, 3.4] },
    rain: { duration: [1.4, 3.4], size: [0.8, 3.2] },
    fog: { duration: [12, 24], size: [180, 570] },
    snow: { duration: [7, 15], size: [1, 3.4] },
    "snow-close": { duration: [4, 8], size: [2.5, 5.1] },
    mote: { duration: [10, 18], size: [2, 4.5] },
    glint: { duration: [4.5, 9], size: [18, 70] },
    ripple: { duration: [3.8, 7.5], size: [36, 92] },
    wind: { duration: [6.5, 11], size: [48, 150] },
  };
  const randomBetween = ([min, max]) => min + Math.random() * (max - min);

  for (const definition of sceneDefinitions) {
    const count = Math.max(1, Math.round(definition.count * densityScale));
    const profile = profiles[definition.type] || profiles.ash;
    const xMin = definition.xMin ?? 0;
    const xMax = definition.xMax ?? 100;
    const yMin = definition.yMin ?? 36;
    const yMax = definition.yMax ?? 90;

    for (let item = 0; item < count; item += 1) {
      const particle = document.createElement("span");
      particle.className = `particle ${definition.type}`;
      const duration = randomBetween(profile.duration);
      const size = randomBetween(profile.size);
      const isWind = definition.type === "wind";
      const drift = isWind ? `${18 + Math.random() * 26}vw` : `${-110 + Math.random() * 250}px`;

      particle.style.setProperty("--x", `${randomBetween([xMin, xMax])}%`);
      particle.style.setProperty("--y", `${randomBetween([yMin, yMax])}%`);
      particle.style.setProperty("--drift", drift);
      particle.style.setProperty("--sway", `${-38 + Math.random() * 76}px`);
      particle.style.setProperty("--duration", `${duration}s`);
      particle.style.setProperty("--delay", `${-Math.random() * duration}s`);
      particle.style.setProperty("--size", `${size}px`);
      particle.style.setProperty("--opacity", `${0.24 + Math.random() * 0.52}`);
      weatherField.append(particle);
    }
  }
}

const refreshWeatherForMotion = () => setWeather(currentIndex);
if (typeof reduceMotion.addEventListener === "function") reduceMotion.addEventListener("change", refreshWeatherForMotion);
else reduceMotion.addListener(refreshWeatherForMotion);

function updateSceneUi(index) {
  currentIndex = index;
  maxVisited = Math.max(maxVisited, index);
  sceneNumber.textContent = sceneLabels[index];
  progressFill.style.width = `${(index / (nodeCount - 1)) * 100}%`;
  journeyPlace.textContent = placeNames[index];
  prevButton.disabled = index === 0;
  nextButton.disabled = index === nodeCount - 1;
  starRail.classList.toggle("is-complete", index === nodeCount - 1);

  starNodes.forEach((node, nodeIndex) => {
    node.classList.toggle("is-lit", nodeIndex <= maxVisited);
    node.classList.toggle("is-current", nodeIndex === index);
    if (nodeIndex === index) node.setAttribute("aria-current", "step");
    else node.removeAttribute("aria-current");
  });

  setWeather(index);
  if (musicRegion === "journey") soundscape.setScene(index);
  else soundscape.sceneIndex = index;
  syncJourneyUrl(index);
}

function renderJourney() {
  const widthChangeInProgress = window.innerWidth !== viewportWidth;
  const position = scrollToNodePosition(
    scroller.scrollLeft,
    scroller.scrollWidth,
    scroller.clientWidth,
    nodeCount,
  );

  worldLayers.forEach((layer, index) => {
    const opacity = clamp(1 - Math.abs(index - position), 0, 1);
    layer.style.opacity = String(opacity);
    layer.classList.toggle("is-active", index === Math.round(position));
  });

  progressFill.style.width = `${(position / (nodeCount - 1)) * 100}%`;
  const roundedIndex = clamp(Math.round(position), 0, nodeCount - 1);
  if (!widthChangeInProgress && roundedIndex !== currentIndex) updateSceneUi(roundedIndex);
  scrollFrame = 0;
}

function requestJourneyRender() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(renderJourney);
}

function goToScene(index, smooth = true) {
  const left = nodeToScrollPosition(index, scroller.scrollWidth, scroller.clientWidth, nodeCount);
  scroller.scrollTo({
    left,
    behavior: smooth && !reduceMotion.matches ? "smooth" : "instant",
  });
}

function settleJourneyToNearest() {
  if (dragState) return;
  const position = scrollToNodePosition(
    scroller.scrollLeft,
    scroller.scrollWidth,
    scroller.clientWidth,
    nodeCount,
  );
  const nearestIndex = clamp(Math.round(position), 0, nodeCount - 1);
  if (Math.abs(position - nearestIndex) > 0.01) goToScene(nearestIndex);
}

scroller.addEventListener("scroll", requestJourneyRender, { passive: true });
scroller.addEventListener("scrollend", settleJourneyToNearest);

let touchStartPoint = null;
scroller.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.touches[0];
    touchStartPoint = touch ? { x: touch.clientX, y: touch.clientY } : null;
  },
  { passive: true },
);
scroller.addEventListener(
  "touchmove",
  (event) => {
    const touch = event.touches[0];
    if (!touch || !touchStartPoint) return;
    const deltaX = touch.clientX - touchStartPoint.x;
    const deltaY = touch.clientY - touchStartPoint.y;
    if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) journeyEngaged = true;
  },
  { passive: true },
);
scroller.addEventListener("touchend", () => {
  touchStartPoint = null;
});

let viewportWidth = window.innerWidth;
let pendingResizeScene = null;
let resizeTimer = 0;

function preserveSceneAcrossResize() {
  const nextWidth = window.innerWidth;
  if (nextWidth !== viewportWidth) {
    if (pendingResizeScene === null) pendingResizeScene = currentIndex;
    viewportWidth = nextWidth;
  }

  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (pendingResizeScene === null) return;
    const keepScene = pendingResizeScene;
    pendingResizeScene = null;
    goToScene(keepScene, false);
    setWeather(keepScene);
    requestJourneyRender();
  }, 90);
}

window.addEventListener("resize", preserveSceneAcrossResize, { passive: true });

const viewportObserver = new ResizeObserver(preserveSceneAcrossResize);
viewportObserver.observe(document.documentElement);

starNodes.forEach((node) => {
  node.addEventListener("click", () => {
    journeyEngaged = true;
    goToScene(Number(node.dataset.target));
  });
});

prevButton.addEventListener("click", () => {
  journeyEngaged = true;
  goToScene(Math.max(0, currentIndex - 1));
});
nextButton.addEventListener("click", () => {
  journeyEngaged = true;
  goToScene(Math.min(nodeCount - 1, currentIndex + 1));
});

scroller.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  journeyEngaged = true;
  if (event.key === "ArrowRight") {
    event.preventDefault();
    goToScene(Math.min(nodeCount - 1, Math.round(currentIndex) + 1));
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    goToScene(Math.max(0, Math.round(currentIndex) - 1));
  } else if (event.key === "Home") {
    event.preventDefault();
    goToScene(0);
  } else if (event.key === "End") {
    event.preventDefault();
    goToScene(nodeCount - 1);
  }
});

let dragState = null;
const dragCommitDistance = 56;

scroller.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch" || event.button !== 0) return;
  if (event.target.closest("a, button, summary, input, textarea, dialog")) return;
  event.preventDefault();
  journeyEngaged = true;
  dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    lastX: event.clientX,
    startScroll: scroller.scrollLeft,
  };
  scroller.classList.add("is-dragging");
  try {
    scroller.setPointerCapture(event.pointerId);
  } catch {
    // Window-level pointer events still keep the drag usable if capture is unavailable.
  }
});

window.addEventListener("pointermove", (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  event.preventDefault();
  dragState.lastX = event.clientX;
  scroller.scrollLeft = dragState.startScroll - (event.clientX - dragState.startX);
});

function finishDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  const dragDistance = dragState.startX - dragState.lastX;
  const startPosition = scrollToNodePosition(
    dragState.startScroll,
    scroller.scrollWidth,
    scroller.clientWidth,
    nodeCount,
  );
  const currentPosition = scrollToNodePosition(
    scroller.scrollLeft,
    scroller.scrollWidth,
    scroller.clientWidth,
    nodeCount,
  );
  let targetIndex = clamp(Math.round(currentPosition), 0, nodeCount - 1);
  if (Math.abs(dragDistance) >= dragCommitDistance) {
    const startIndex = clamp(Math.round(startPosition), 0, nodeCount - 1);
    if (targetIndex === startIndex) {
      targetIndex = clamp(startIndex + Math.sign(dragDistance), 0, nodeCount - 1);
    }
  }
  dragState = null;
  scroller.classList.remove("is-dragging");
  if (scroller.hasPointerCapture(event.pointerId)) scroller.releasePointerCapture(event.pointerId);
  goToScene(targetIndex);
}

window.addEventListener("pointerup", finishDrag);
window.addEventListener("pointercancel", finishDrag);
scroller.addEventListener("dragstart", (event) => event.preventDefault());

let wheelLocked = false;
let wheelUnlockTimer = 0;

scroller.addEventListener(
  "wheel",
  (event) => {
    if (event.ctrlKey || $(".fragment-dialog").open) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      if (Math.abs(event.deltaX) > 0) journeyEngaged = true;
      return;
    }
    journeyEngaged = true;
    const direction = Math.sign(event.deltaY);
    if (direction === 0) return;
    const position = scrollToNodePosition(
      scroller.scrollLeft,
      scroller.scrollWidth,
      scroller.clientWidth,
      nodeCount,
    );
    const leavingAtStart = position <= 0.01 && direction < 0;
    const leavingAtEnd = position >= nodeCount - 1 - 0.01 && direction > 0;
    if (leavingAtStart || leavingAtEnd) return;
    if (wheelLocked) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    wheelLocked = true;
    goToScene(clamp(Math.round(currentIndex) + direction, 0, nodeCount - 1));
    window.clearTimeout(wheelUnlockTimer);
    wheelUnlockTimer = window.setTimeout(() => {
      wheelLocked = false;
    }, 520);
  },
  { passive: false },
);

updateSceneUi(0);
requestJourneyRender();

if (hasChapterParam) {
  journeyEngaged = true;
  requestAnimationFrame(() => {
    $("#journey").scrollIntoView({ block: "start", behavior: "instant" });
    goToScene(initialChapter, false);
    syncJourneyUrl(initialChapter);
  });
}

const musicSections = $$("[data-music]");
if ("IntersectionObserver" in window) {
  const musicObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (!visible) return;
      const nextRegion = visible.target.dataset.music;
      if (nextRegion === musicRegion) return;
      musicRegion = nextRegion;
      if (musicRegion === "journey") soundscape.setScene(currentIndex, true);
      else soundscape.setTheme(musicRegion, musicRegion === "finale");
    },
    { rootMargin: "-44% 0px -44% 0px", threshold: 0 },
  );
  musicSections.forEach((section) => musicObserver.observe(section));
} else {
  musicRegion = window.location.hash === "#journey" ? "journey" : "cover";
}

/* =========================================================
   People corridor
   ========================================================= */
const people = [
  {
    id: "chen",
    name: "陈树湘",
    years: "1905—1934",
    role: "红三十四师师长 · 湘江后卫",
    line: "“为苏维埃新中国流尽最后一滴血。”这是他所坚守的誓言，也是湘江边最沉重的一次断后。",
    detail: "1934年湘江战役中，陈树湘率部担任全军后卫。部队被重兵包围后，他腹部中弹被捕，在敌人押送途中壮烈牺牲，年仅29岁。",
    note: "纪念馆为陈树湘所在部队的战役关联现场，并非陈树湘本人肖像。",
    image: "assets/people/xiangjiang-memorial.webp",
    width: 1200,
    height: 800,
    alt: "红军长征湘江战役纪念馆正面，建筑中央为大型红色五角星",
    kind: "关联现场",
    caption: "陈树湘所在部队的战役关联现场：湘江战役纪念馆",
    credit: "N509FZ · CC BY-SA 4.0 · 已裁切",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Xiangjiang_Campaign_Memorial_Hall,_Quanzhou_(20250122171627).jpg",
  },
  {
    id: "zhong",
    name: "钟赤兵",
    years: "1914—1975",
    role: "红军指挥员 · 独腿走完长征",
    line: "娄山关负伤后，他失去右腿，却没有离开队伍。",
    detail: "1935年娄山关战斗中，钟赤兵右腿负重伤。因条件所限，他先后接受三次截肢手术，仍坚持随部队完成长征。身体的缺口没有截断他的选择。",
    note: "历史肖像，并非长征现场照片。",
    image: "assets/people/zhong-chibing.webp",
    width: 500,
    height: 666,
    alt: "钟赤兵历史肖像，戴圆框眼镜，身穿深色制服",
    kind: "历史肖像",
    caption: "钟赤兵历史肖像",
    credit: "政协秘书处 · 公有领域",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%E9%8D%BE%E8%B5%A4%E5%85%B5.jpg",
  },
  {
    id: "xu",
    name: "徐解秀",
    years: "普通百姓",
    role: "“半条被子”故事主人公",
    line: "什么是共产党？就是自己有一条被子，也要剪下半条给老百姓的人。",
    detail: "1934年11月，三名女红军借宿徐解秀家中。临别时，她们把仅有的一床被子剪下一半留给她。“半条被子”留下的不只是物品，也是军民之间的信任。",
    note: "使用故事发生地沙洲村实景，并非徐解秀本人。",
    image: "assets/people/shazhou-village.webp",
    width: 809,
    height: 465,
    alt: "湖南汝城沙洲村入口实景，白墙黛瓦建筑上方写有沙洲村字样",
    kind: "故事发生地",
    caption: "徐解秀故事发生地：湖南汝城沙洲村",
    credit: "华声在线 / 新湖南 · 媒体资料图",
    sourceUrl: "https://www.voc.com.cn/",
  },
  {
    id: "mao",
    name: "毛泽东",
    years: "1893—1976",
    role: "中共中央领导人",
    line: "在历史转折处，重新校准前行的方向。",
    detail: "1935年1月，遵义会议集中解决当时具有决定意义的军事和组织问题，实际确立了毛泽东在中共中央和红军的领导地位。此后，中央红军继续北上。",
    note: "公共领域历史影像，并非长征现场影像；播放时保持静音。",
    image: "assets/people/mao-zedong.jpg",
    width: 673,
    height: 908,
    alt: "毛泽东1950年历史肖像",
    kind: "历史影像",
    caption: "1930年代毛泽东历史影像 · 无声",
    credit: "Wikimedia Commons · 公有领域",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Chairman_Mao-4.webm",
  },
  {
    id: "zhou",
    name: "周恩来",
    years: "1898—1976",
    role: "中共中央领导人 · 遵义会议参与者",
    line: "在漫长行军与反复协调中，维持队伍的方向与秩序。",
    detail: "长征期间，周恩来参与中央重大决策和红军组织协调，出席遵义会议，并在后续行动中承担重要领导工作。",
    note: "历史肖像摄于1972年，并非长征现场照片。",
    image: "assets/people/zhou-enlai.jpg",
    width: 717,
    height: 961,
    alt: "周恩来历史肖像，身穿深色中山装",
    kind: "历史肖像",
    caption: "周恩来历史肖像 · 1972年",
    credit: "White House Photo Office · 公有领域",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Premier_Chou_En-Lai_in_the_Great_Hall_of_the_People%27s_Banquet_Hall_-_DPLA_-_a40021a8100507bc7a244420481bf488.jpg",
  },
  {
    id: "zhu",
    name: "朱德",
    years: "1886—1976",
    role: "红军总司令",
    line: "把分散的队伍组织成能够继续前进的力量。",
    detail: "朱德任中国工农红军总司令并参加长征，与中央红军一同完成战略转移，在军事指挥和部队建设中承担重要职责。",
    note: "历史肖像拍摄年份待考，并非长征现场照片。",
    image: "assets/people/zhu-de.jpg",
    width: 830,
    height: 1097,
    alt: "朱德身穿军装的历史肖像",
    kind: "历史肖像",
    caption: "朱德历史肖像",
    credit: "佚名 · 公有领域",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Zhu_De,_Commander_of_PLA.jpg",
  },
  {
    id: "he",
    name: "贺龙",
    years: "1896—1969",
    role: "红二方面军领导人",
    line: "从另一条路线出发，也走向同一个会师方向。",
    detail: "1935年11月，贺龙率红二、六军团从湘鄂川黔根据地出发长征。1936年，部队在甘孜地区与红四方面军会师，后编为红二方面军继续北上。",
    note: "历史肖像，并非长征现场照片。",
    image: "assets/people/he-long.jpg",
    width: 470,
    height: 620,
    alt: "贺龙身穿军装、蓄短须的历史肖像",
    kind: "历史肖像",
    caption: "贺龙历史肖像",
    credit: "林扬 / 解放军画报 · 公有领域",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:He_Long.jpg",
  },
  {
    id: "cai",
    name: "蔡畅",
    years: "1900—1990",
    role: "妇女运动领导者 · 长征亲历者",
    line: "长征队伍里，有她们走过的路。",
    detail: "蔡畅参加中央红军长征，是长征队伍中为数不多的女性之一。她长期从事妇女和群众工作，把革命动员带到更广阔的人群中。",
    note: "历史肖像，并非长征现场照片。",
    image: "assets/people/cai-chang.jpg",
    width: 496,
    height: 594,
    alt: "蔡畅青年时期历史肖像",
    kind: "历史肖像",
    caption: "蔡畅历史肖像",
    credit: "佚名 · 公有领域",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Cai_Chang.jpg",
  },
];

const peopleShowcase = $("#people-showcase");
const peopleTrack = $("#people-track");
const peopleViewport = $("#people-viewport");
const peoplePrev = $("#people-prev");
const peopleNext = $("#people-next");
const peopleToggle = $("#people-toggle");
const peopleAutoState = $("#people-auto-state");
const orderedPeople = people.filter((person) => person.id === "mao")
  .concat(people.filter((person) => person.id !== "mao"));
const corridorPeople = orderedPeople.slice(1);
const peopleSelectionStatus = $("#people-selection-status");
const peopleFeaturePhoto = $("#people-feature-photo");
const peopleFeatureVideo = $("#people-feature-video");
const peopleFeatureVideoPoster = peopleFeatureVideo.dataset.poster;
const peopleFeatureKind = $("#people-feature-kind");
const peopleFeatureCaption = $("#people-feature-caption");
const peopleFeatureSource = $("#people-feature-source");
const peopleFeatureName = $("#people-feature-name");
const peopleFeatureRole = $("#people-feature-role");
const peopleFeatureLine = $("#people-feature-line");
const peopleFeatureDetail = $("#people-feature-detail");
const peopleFeatureNote = $("#people-feature-note");
const peopleReset = $("#people-reset");
const compactPeopleMotion = window.matchMedia("(max-width: 719px)");

let currentPerson = 0;
let peopleManuallyPaused = false;
let peopleHoverPaused = false;
let peopleFocusPaused = false;
let peopleDragging = false;
let peopleInView = false;
let suppressPeopleClick = false;
let peopleDragState = null;
let peopleFrame = 0;
let peopleFrameTime = 0;
let peopleScrollPosition = 0;
let peopleLoopWidth = 0;
let peopleFeatureVideoEnabled = false;

function syncPeopleFeatureVideo() {
  const shouldPlay = peopleFeatureVideoEnabled && peopleInView && !reduceMotion.matches;
  if (shouldPlay) {
    if (!peopleFeatureVideo.getAttribute("poster")) {
      peopleFeatureVideo.poster = peopleFeatureVideoPoster;
    }
    peopleFeatureVideo.preload = "metadata";
    peopleFeatureVideo.play().catch(() => {});
  } else {
    peopleFeatureVideo.pause();
  }
}

function personCardMarkup(person, index, isClone = false) {
  const hidden = isClone ? ' aria-hidden="true" inert' : "";
  return `
    <li class="people-card" data-person="${person.id}" data-person-index="${index}"${hidden}>
      <button class="people-card-select" type="button" data-person="${person.id}" data-person-index="${index}" aria-label="查看${person.name}，${person.role}">
        <figure>
          <img src="${person.image}" width="${person.width}" height="${person.height}" loading="lazy" decoding="async" alt="">
          <span class="people-card-kind">${person.kind}</span>
        </figure>
        <span class="people-card-copy">
          <span class="people-card-heading">
            <strong>${person.name}</strong>
            <small>${person.role}</small>
          </span>
        </span>
      </button>
      <p class="people-card-line">${person.line}</p>
      <details class="people-card-details">
        <summary>展开档案</summary>
        <div>
          <p>${person.detail}</p>
          <p>${person.note} <a href="${person.sourceUrl}" target="_blank" rel="noopener noreferrer">${person.credit}</a></p>
        </div>
      </details>
    </li>`;
}

if (peopleShowcase && peopleTrack && peopleViewport) {
  peopleTrack.innerHTML = corridorPeople.map((person, index) => personCardMarkup(person, index + 1)).join("")
    + corridorPeople.map((person, index) => personCardMarkup(person, index + 1, true)).join("");

  const allPeopleCards = $$(".people-card", peopleTrack);

  function setPeopleFeature(index, announce = true) {
    const normalized = (index + orderedPeople.length) % orderedPeople.length;
    const person = orderedPeople[normalized];
    currentPerson = normalized;
    peopleFeatureVideoEnabled = normalized === 0;
    peopleFeaturePhoto.hidden = peopleFeatureVideoEnabled;
    peopleFeatureVideo.hidden = !peopleFeatureVideoEnabled;
    peopleFeaturePhoto.src = person.image;
    peopleFeaturePhoto.width = person.width;
    peopleFeaturePhoto.height = person.height;
    peopleFeaturePhoto.alt = person.alt;
    peopleFeatureKind.textContent = person.kind;
    peopleFeatureCaption.textContent = person.caption;
    peopleFeatureSource.href = person.sourceUrl;
    peopleFeatureSource.textContent = person.credit;
    peopleFeatureName.textContent = person.name;
    peopleFeatureRole.textContent = `${person.role} · ${person.years}`;
    peopleFeatureLine.textContent = person.line;
    peopleFeatureDetail.textContent = person.detail;
    peopleFeatureNote.textContent = person.note;
    syncPeopleFeatureVideo();
    peopleReset.hidden = normalized === 0;
    if (announce) peopleSelectionStatus.textContent = `当前阅读${person.name}，${person.role}`;

    allPeopleCards.forEach((card) => {
      card.classList.toggle("is-active", Number(card.dataset.personIndex) === normalized);
    });
  }

  function measurePeopleLoopWidth() {
    const firstCard = peopleTrack.children[0];
    const firstClone = peopleTrack.children[corridorPeople.length];
    peopleLoopWidth = firstCard && firstClone ? firstClone.offsetLeft - firstCard.offsetLeft : 0;
    return peopleLoopWidth;
  }

  function getPeopleLoopWidth() {
    return peopleLoopWidth || measurePeopleLoopWidth();
  }

  function wrapPeopleScroll(nextLeft = peopleViewport.scrollLeft) {
    const loopWidth = getPeopleLoopWidth();
    if (loopWidth <= 0) return peopleViewport.scrollLeft;
    let normalized = nextLeft;
    while (normalized < 0) normalized += loopWidth;
    while (normalized >= loopWidth) normalized -= loopWidth;
    return normalized;
  }

  function scrollToPerson(index) {
    const instances = allPeopleCards.filter((card) => Number(card.dataset.personIndex) === index);
    if (!instances.length) return;
    const viewportCenter = peopleViewport.scrollLeft + peopleViewport.clientWidth / 2;
    const nearest = instances.reduce((best, card) => {
      const bestCenter = best.offsetLeft + best.offsetWidth / 2;
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      return Math.abs(cardCenter - viewportCenter) < Math.abs(bestCenter - viewportCenter) ? card : best;
    });
    const target = nearest.offsetLeft - (peopleViewport.clientWidth - nearest.offsetWidth) / 2;
    peopleViewport.scrollTo({
      left: wrapPeopleScroll(target),
      behavior: reduceMotion.matches ? "auto" : "smooth",
    });
  }

  function selectPerson(index, { scroll = false } = {}) {
    const normalized = (index + orderedPeople.length) % orderedPeople.length;
    setPeopleFeature(normalized);
    if (scroll && normalized > 0) scrollToPerson(normalized);
  }

  function syncPeopleControls() {
    const manualOnly = reduceMotion.matches || compactPeopleMotion.matches;
    peopleToggle.disabled = manualOnly;
    peopleToggle.textContent = manualOnly
      ? "手动浏览"
      : peopleManuallyPaused
        ? "继续人物流动"
        : "暂停人物流动";
    peopleToggle.setAttribute("aria-label", peopleToggle.textContent);
    peopleAutoState.textContent = manualOnly
      ? reduceMotion.matches
        ? "静态浏览 · 使用前后按钮"
        : "手动浏览 · 左右滑动或点按箭头"
      : peopleManuallyPaused
        ? "浏览已暂停 · 左右拖动"
        : "自动前行 · 左右拖动或悬停暂停";
  }

  function canAutoScrollPeople() {
    return peopleInView
      && !peopleManuallyPaused
      && !peopleHoverPaused
      && !peopleFocusPaused
      && !peopleDragging
      && !document.hidden
      && !reduceMotion.matches
      && !compactPeopleMotion.matches;
  }

  function tickPeopleCorridor(timestamp) {
    if (!peopleFrameTime) peopleFrameTime = timestamp;
    const delta = Math.min(timestamp - peopleFrameTime, 48);
    peopleFrameTime = timestamp;
    if (canAutoScrollPeople()) {
      peopleScrollPosition = wrapPeopleScroll(peopleScrollPosition + delta * 0.024);
      peopleViewport.scrollLeft = Math.round(peopleScrollPosition);
    }
    peopleFrame = requestAnimationFrame(tickPeopleCorridor);
  }

  peopleTrack.addEventListener("click", (event) => {
    if (suppressPeopleClick) return;
    const card = event.target.closest(".people-card");
    if (!card) return;
    peopleManuallyPaused = true;
    syncPeopleControls();
    selectPerson(Number(card.dataset.personIndex));
  });

  peopleTrack.addEventListener("pointerdown", () => {
    peopleManuallyPaused = true;
    syncPeopleControls();
  });

  peopleTrack.addEventListener("focusin", (event) => {
    const card = event.target.closest(".people-card");
    if (!card || card.getAttribute("aria-hidden") === "true") return;
    selectPerson(Number(card.dataset.personIndex));
    peopleFocusPaused = true;
  });

  peopleViewport.addEventListener("focusout", (event) => {
    if (!peopleViewport.contains(event.relatedTarget)) peopleFocusPaused = false;
  });
  peopleViewport.addEventListener("pointerenter", () => {
    peopleHoverPaused = true;
  });
  peopleViewport.addEventListener("pointerleave", () => {
    peopleHoverPaused = false;
  });
  peopleViewport.addEventListener("dragstart", (event) => event.preventDefault());

  peopleViewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") return;
    peopleDragState = {
      x: event.clientX,
      left: peopleViewport.scrollLeft,
      moved: false,
    };
    peopleDragging = true;
    peopleViewport.setPointerCapture(event.pointerId);
  });

  peopleViewport.addEventListener("pointermove", (event) => {
    if (!peopleDragState) return;
    const deltaX = event.clientX - peopleDragState.x;
    if (Math.abs(deltaX) > 5) {
      peopleDragState.moved = true;
      event.preventDefault();
      peopleScrollPosition = wrapPeopleScroll(peopleDragState.left - deltaX);
      peopleViewport.scrollLeft = Math.round(peopleScrollPosition);
    }
  });

  function finishPeopleDrag(event) {
    if (!peopleDragState) return;
    suppressPeopleClick = peopleDragState.moved;
    peopleDragState = null;
    peopleDragging = false;
    if (suppressPeopleClick) {
      peopleManuallyPaused = true;
      syncPeopleControls();
    }
    if (peopleViewport.hasPointerCapture?.(event.pointerId)) peopleViewport.releasePointerCapture(event.pointerId);
    window.setTimeout(() => {
      suppressPeopleClick = false;
    }, 0);
  }

  peopleViewport.addEventListener("pointerup", finishPeopleDrag);
  peopleViewport.addEventListener("pointercancel", finishPeopleDrag);

  peopleViewport.addEventListener("scroll", () => {
    const loopWidth = getPeopleLoopWidth();
    if (loopWidth > 0 && peopleViewport.scrollLeft >= loopWidth) {
      peopleScrollPosition = peopleViewport.scrollLeft - loopWidth;
      peopleViewport.scrollLeft = peopleScrollPosition;
    } else if (!canAutoScrollPeople()) {
      peopleScrollPosition = peopleViewport.scrollLeft;
    }
  }, { passive: true });

  peopleViewport.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      peopleManuallyPaused = true;
      syncPeopleControls();
      selectPerson(currentPerson - 1, { scroll: true });
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      peopleManuallyPaused = true;
      syncPeopleControls();
      selectPerson(currentPerson + 1, { scroll: true });
    } else if (event.key === "Home") {
      event.preventDefault();
      peopleManuallyPaused = true;
      syncPeopleControls();
      selectPerson(0);
    } else if (event.key === "End") {
      event.preventDefault();
      peopleManuallyPaused = true;
      syncPeopleControls();
      selectPerson(orderedPeople.length - 1, { scroll: true });
    }
  });

  peoplePrev.addEventListener("click", () => {
    peopleManuallyPaused = true;
    syncPeopleControls();
    selectPerson(currentPerson - 1, { scroll: true });
  });
  peopleNext.addEventListener("click", () => {
    peopleManuallyPaused = true;
    syncPeopleControls();
    selectPerson(currentPerson + 1, { scroll: true });
  });
  peopleReset.addEventListener("click", () => {
    selectPerson(0);
  });
  peopleToggle.addEventListener("click", () => {
    peopleManuallyPaused = !peopleManuallyPaused;
    syncPeopleControls();
  });

  const refreshPeopleMotionPreference = () => {
    peopleManuallyPaused = false;
    syncPeopleControls();
    syncPeopleFeatureVideo();
  };
  if (typeof reduceMotion.addEventListener === "function") {
    reduceMotion.addEventListener("change", refreshPeopleMotionPreference);
    compactPeopleMotion.addEventListener("change", refreshPeopleMotionPreference);
  } else {
    reduceMotion.addListener(refreshPeopleMotionPreference);
    compactPeopleMotion.addListener(refreshPeopleMotionPreference);
  }

  if ("IntersectionObserver" in window) {
    const peopleObserver = new IntersectionObserver(
      ([entry]) => {
        peopleInView = entry.isIntersecting;
        syncPeopleFeatureVideo();
      },
      { rootMargin: "-20% 0px -20% 0px", threshold: 0 },
    );
    peopleObserver.observe(peopleShowcase);
  } else {
    peopleInView = true;
  }

  setPeopleFeature(0, false);
  syncPeopleControls();
  peopleScrollPosition = peopleViewport.scrollLeft;
  measurePeopleLoopWidth();
  if ("ResizeObserver" in window) {
    const peopleSizeObserver = new ResizeObserver(() => measurePeopleLoopWidth());
    peopleSizeObserver.observe(peopleTrack);
  } else {
    window.addEventListener("resize", measurePeopleLoopWidth, { passive: true });
  }
  peopleFrame = requestAnimationFrame(tickPeopleCorridor);
}

/* =========================================================
   Memory fragments
   ========================================================= */
const fragments = {
  bugle: {
    meta: "记忆碎片 01 · 1934 冬 · 湘江",
    title: "号声没有停",
    text: "军号在战场上传递命令，也替倒下的人继续发声。湘江之后，许多番号不复完整；但队伍带着他们的意志继续向西，走进更深的夜色。",
    source: {
      note: "画面为奥克兰战争纪念博物馆收藏的20世纪初军号实物，并非湘江战役原物，仅作同期军号形制参考。",
      label: "原始文件 · CC BY 4.0",
      url: "https://commons.wikimedia.org/wiki/File:Bugle_(AM_2016.45.1-1).jpg",
    },
    art: `
      <figure class="artifact-photo artifact-photo--catalog">
        <img src="assets/fragments/period-bugle.jpg" width="1280" height="675" decoding="async"
          alt="一支带绿色编织挂绳的弧形铜制军号，置于浅色背景前">
        <figcaption>20世纪初军用军号 · 同期形制实物参考</figcaption>
      </figure>`,
  },
  letter: {
    meta: "记忆碎片 02 · 1935.01 · 遵义",
    title: "灯下的家书",
    text: "长征途中，许多信没有等到寄出的那一天。它们写平安，也写牵挂；写不知何时再见，也写相信脚下这条路值得走下去。信纸很薄，托住的却是一个时代的重量。",
    source: {
      note: "画面为红军家信免贴邮票印一级文物实物照片，摄影师 Cangminzho。它记录的是红军家书得以传递的制度痕迹。",
      label: "原始文件 · CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%E7%BA%A2%E5%86%9B%E5%AE%B6%E4%BF%A1%E5%85%8D%E8%B4%B4%E9%82%AE%E7%A5%A8%E5%8D%B03727.jpg",
    },
    art: `
      <figure class="artifact-photo">
        <img src="assets/fragments/red-army-family-mail.jpg" width="1280" height="853" decoding="async"
          alt="红军家信免贴邮票印一级文物，印版上保留红色文字痕迹">
        <figcaption>红军家信免贴邮票印 · 一级文物</figcaption>
      </figure>`,
  },
  "straw-shoes": {
    meta: "记忆碎片 03 · 1935.06 · 夹金山",
    title: "雪线之上，一双草鞋",
    text: "草鞋不保温，也难以抵挡锋利的冰凌。翻越夹金山时，红军指战员面对严寒、缺氧与陡峭山路，仍彼此搀扶向上。真正支撑脚步的，是共同走下去的纪律与信念。",
    source: {
      note: "画面为三年游击战争时期红军游击队员穿过的草鞋实物照片，摄影师 Huanokinhejo。",
      label: "原始文件 · CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:%E4%B8%89%E5%B9%B4%E6%B8%B8%E5%87%BB%E6%88%98%E6%97%B6%E6%9C%9F_%E7%BA%A2%E5%86%9B%E6%B8%B8%E5%87%BB%E9%98%9F%E5%91%98_%E7%A9%BF%E8%BF%87%E7%9A%84%E8%8D%89%E9%9E%8B_20191016_104040.jpg",
    },
    art: `
      <figure class="artifact-photo">
        <img src="assets/fragments/red-army-straw-shoes.jpg" width="1280" height="960" decoding="async"
          alt="博物馆展柜中一双磨损明显的红军草鞋实物">
        <figcaption>红军游击队员穿过的草鞋 · 实物照片</figcaption>
      </figure>`,
  },
  photo: {
    meta: "记忆碎片 04 · 1935.08 · 草地",
    title: "一张真实的历史合影",
    text: "1935年11月29日，红六军团领导人在湖南新化留下这张合影。前排左起为周仁杰、李铨、王震、夏曦、萧克。镜头能留下的只是少数人的面容，更多走过草地的战士没有留下姓名。",
    source: {
      note: "画面为1935年11月29日红六军团领导人在湖南新化的历史合影，作者不详，现属公有领域。",
      label: "原始文件 · 公有领域",
      url: "https://commons.wikimedia.org/wiki/File:Hongerliujuntuan.jpg",
    },
    art: `
      <figure class="artifact-photo artifact-photo--archive">
        <img src="assets/fragments/red-sixth-army-group-1935.jpg" width="698" height="357" decoding="async"
          alt="1935年红六军团领导人在湖南新化的黑白历史合影">
        <figcaption>1935年11月29日 · 红六军团领导人历史合影</figcaption>
      </figure>`,
  },
};

const fragmentDialog = $("#fragment-dialog");
const fragmentMeta = $("#fragment-meta");
const fragmentTitle = $("#fragment-title");
const fragmentText = $("#fragment-text");
const fragmentSource = $("#fragment-source");
const artifactVisual = $("#artifact-visual");
const dialogClose = $("#dialog-close");
let fragmentTrigger = null;

function openFragment(key, trigger) {
  const fragment = fragments[key];
  if (!fragment) return;
  fragmentTrigger = trigger;
  fragmentMeta.textContent = fragment.meta;
  fragmentTitle.textContent = fragment.title;
  fragmentText.textContent = fragment.text;
  artifactVisual.innerHTML = fragment.art;
  fragmentSource.replaceChildren(document.createTextNode(`${fragment.source.note} `));
  const sourceLink = document.createElement("a");
  sourceLink.href = fragment.source.url;
  sourceLink.target = "_blank";
  sourceLink.rel = "noopener noreferrer";
  sourceLink.textContent = fragment.source.label;
  fragmentSource.append(sourceLink);
  document.body.classList.add("is-dialog-open");
  fragmentDialog.showModal();
}

$$(".fragment-trigger").forEach((trigger) => {
  trigger.addEventListener("click", () => openFragment(trigger.dataset.fragment, trigger));
});

dialogClose.addEventListener("click", () => fragmentDialog.close());
fragmentDialog.addEventListener("click", (event) => {
  if (event.target === fragmentDialog) fragmentDialog.close();
});
fragmentDialog.addEventListener("close", () => {
  document.body.classList.remove("is-dialog-open");
  fragmentTrigger?.focus();
});
fragmentDialog.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const focusable = $$(
    'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    fragmentDialog,
  );
  if (focusable.length === 0) {
    event.preventDefault();
    fragmentDialog.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && (document.activeElement === first || document.activeElement === fragmentDialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === fragmentDialog)) {
    event.preventDefault();
    first.focus();
  }
});

/* =========================================================
   Spark wall
   ========================================================= */
const messageList = $("#message-list");
const seedNodes = $$(".message-item", messageList);
const seedMessages = seedNodes.map((item) => ({
  id: `seed-${item.textContent.trim().slice(0, 8)}`,
  isSeed: true,
  name: $("div span", item)?.textContent || "策展寄语",
  time: $("time", item)?.textContent || "",
  message: $("p", item)?.textContent || "",
  likes: 0,
}));
const localKey = "longmarch-spark-messages";
const likedKey = "longmarch-spark-liked";
const likeDeltaKey = "longmarch-spark-like-deltas";
const form = $("#spark-form");
const nameInput = $("#visitor-name");
const messageInput = $("#spark-message");
const messageCount = $("#message-count");
const sparkProgress = $("#spark-progress");
const sparkProgressFill = $("#spark-progress-fill");
const sparkDemoActions = $("#spark-demo-actions");
const sparkDemoButton = $("#spark-demo-add");
const sparkDemoLabel = $("#spark-demo-label");
const sparkDemoRemoveButton = $("#spark-demo-remove");
const characterCount = $("#spark-count");
const formStatus = $("#spark-status");
const submitButton = $("#spark-submit");
const storageNote = $("#storage-note");
const sparkWall = $("#spark-wall");
const sparkConstellation = $("#spark-constellation");
const sparkRoutePath = $("#spark-route-path");
const sparkRouteLength = sparkRoutePath.getTotalLength();
const sparkPositions = Array.from({ length: 10 }, (_, index) => {
  const point = sparkRoutePath.getPointAtLength((index / 9) * sparkRouteLength);
  return [point.x, point.y];
});
let communityMessages = [];
let serverAvailable = false;
let renderedSparkCount = 0;
let sparkIgniteTimer = 0;
let sparkIsVisible = false;
let sparkRevealStarted = false;
let sparkTargetEnergy = 0;
let sparkTargetStarCount = 0;

function readStringArray(key) {
  try {
    const parsed = JSON.parse(storage.get(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function readLikeDeltas() {
  try {
    const parsed = JSON.parse(storage.get(likeDeltaKey) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([id, count]) => [id, Math.max(0, Math.floor(Number(count) || 0))])
        .filter(([, count]) => count > 0),
    );
  } catch {
    return {};
  }
}

const likedMessageIds = new Set(readStringArray(likedKey));
const likeDeltas = readLikeDeltas();

function persistLikeState() {
  return storage.set(likedKey, JSON.stringify([...likedMessageIds]))
    && storage.set(likeDeltaKey, JSON.stringify(likeDeltas));
}

function displayedLikeCount(item) {
  return Math.max(0, Math.floor(Number(item.likes) || 0)) + (likeDeltas[item.id] || 0);
}

function updateLikeButton(button, item) {
  const liked = likedMessageIds.has(item.id);
  const likes = displayedLikeCount(item);
  button.classList.toggle("is-liked", liked);
  button.setAttribute("aria-pressed", String(liked));
  button.setAttribute("aria-disabled", String(liked));
  button.setAttribute(
    "aria-label",
    `${liked ? "已点赞" : "点赞"}，${item.name || "一位后来者"}的留言，当前 ${likes} 个赞`,
  );
  $(".message-like-count", button).textContent = String(likes);
}

function readLocalMessages() {
  try {
    const parsed = JSON.parse(storage.get(localKey) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.message === "string").slice(0, 30);
  } catch {
    return [];
  }
}

function writeLocalMessages(items) {
  return storage.set(localKey, JSON.stringify(items.slice(0, 30)));
}

function formatTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "今天";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function revealSparkRoute() {
  if (sparkRevealStarted || !sparkTargetStarCount) return;
  sparkRevealStarted = true;
  sparkRoutePath.style.strokeDasharray = `${(sparkTargetStarCount / sparkPositions.length) * 100} 100`;
  sparkProgressFill.style.width = `${(sparkTargetStarCount / sparkPositions.length) * 100}%`;
  sparkWall.style.setProperty("--spark-energy", sparkTargetEnergy.toFixed(3));
  sparkWall.dataset.sparkRevealed = "true";
}

if ("IntersectionObserver" in window) {
  const sparkObserver = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    sparkIsVisible = true;
    revealSparkRoute();
    if (sparkRevealStarted) sparkObserver.disconnect();
  }, { threshold: 0.2 });
  sparkObserver.observe(sparkWall);
} else {
  sparkIsVisible = true;
}

function updateSparkAtmosphere(messageCount, ignite = false) {
  const count = Math.max(0, Math.floor(Number(messageCount) || 0));
  const energy = Math.min(1, Math.log2(count + 1) / Math.log2(11));
  const level = count >= 10 ? 4 : count >= 7 ? 3 : count >= 4 ? 2 : count >= 1 ? 1 : 0;
  sparkWall.dataset.sparkLevel = String(level);

  const starCount = Math.min(sparkPositions.length, count);
  sparkProgress.textContent = `${Math.round((starCount / sparkPositions.length) * 100)}%`;
  sparkDemoButton.disabled = count >= 10;
  sparkDemoLabel.textContent = count >= 10
    ? "路线已完全点亮"
    : "一键增加一束演示星火";
  syncDemoActionState();
  sparkTargetEnergy = energy;
  sparkTargetStarCount = starCount;
  if (starCount !== renderedSparkCount) {
    sparkConstellation.replaceChildren(...sparkPositions.slice(0, starCount).map(([x, y], index) => {
      const star = document.createElement("span");
      const routeProgress = index / (sparkPositions.length - 1);
      star.className = "spark-star";
      star.style.setProperty("--x", `${x}%`);
      star.style.setProperty("--y", `${y}%`);
      star.style.setProperty("--size", `${(3.5 + routeProgress * 4).toFixed(1)}px`);
      star.style.setProperty("--route-progress", routeProgress.toFixed(3));
      star.style.setProperty("--reveal-delay", `${index * 34}ms`);
      star.style.setProperty("--delay", `${-(index * 0.73)}s`);
      star.style.setProperty("--duration", `${3.8 + (index % 4) * 0.65}s`);
      return star;
    }));
    renderedSparkCount = starCount;
  }

  if (!sparkRevealStarted) {
    sparkWall.style.setProperty("--spark-energy", "0");
    sparkRoutePath.style.strokeDasharray = "0 100";
    sparkProgressFill.style.width = "0%";
    if (sparkIsVisible) revealSparkRoute();
  } else {
    sparkRoutePath.style.strokeDasharray = `${(starCount / sparkPositions.length) * 100} 100`;
    sparkProgressFill.style.width = `${(starCount / sparkPositions.length) * 100}%`;
    sparkWall.style.setProperty("--spark-energy", energy.toFixed(3));
  }

  if (!ignite || !starCount) return;
  const newest = sparkConstellation.lastElementChild;
  window.clearTimeout(sparkIgniteTimer);
  sparkConstellation.querySelector(".is-ignited")?.classList.remove("is-ignited");
  newest.classList.add("is-ignited");
  sparkIgniteTimer = window.setTimeout(() => newest.classList.remove("is-ignited"), 950);
}

function buildMessageItem(item) {
  const listItem = document.createElement("li");
  listItem.className = "message-item";
  if (item.isSeed) listItem.classList.add("message-item--seed");

  const ember = document.createElement("span");
  ember.className = "message-ember";
  ember.setAttribute("aria-hidden", "true");

  const copy = document.createElement("p");
  copy.textContent = item.message;

  const meta = document.createElement("div");
  const author = document.createElement("span");
  const time = document.createElement("time");
  author.textContent = item.name || "一位后来者";
  if (item.isLocal) {
    const source = document.createElement("span");
    source.className = "message-source";
    source.textContent = "仅本机";
    author.append(" · ", source);
  }
  time.textContent = item.time || formatTime(item.createdAt);
  meta.append(author, time);

  const likeButton = document.createElement("button");
  likeButton.className = "message-like";
  likeButton.type = "button";
  likeButton.dataset.messageId = item.id;
  likeButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c-3.6-4.2-6-7.3-6-10.5a6 6 0 0 1 12 0C18 13.7 15.6 16.8 12 21Z"/></svg>
    <span class="message-like-count">0</span>`;
  updateLikeButton(likeButton, item);

  listItem.append(ember, copy, meta, likeButton);
  return listItem;
}

const demoSparkMessages = [
  "路再远，也要从脚下这一步开始。",
  "有人记得，走过黑夜的路就不会消失。",
  "向前的人，也在为后来者留下方向。",
  "把微小的坚持连起来，就是一条路。",
  "每一句记住，都是给历史的一次回应。",
  "今天认真走的路，也会成为明天的来路。",
  "走得慢没有关系，方向清楚就好。",
  "先走的人留下光，后来的人接着走。",
  "真正的抵达，是把这段路继续传下去。",
  "山高路远，脚步比答案更诚实。",
  "愿这一点光，陪你走过自己的长征。",
];
let demoSparkIndex = readLocalMessages().filter((message) => message.id.startsWith("demo-")).length;

function syncDemoActionState() {
  const hasDemoMessages = readLocalMessages().some((message) => message.id.startsWith("demo-"));
  sparkDemoRemoveButton.disabled = !hasDemoMessages;
  sparkDemoRemoveButton.title = hasDemoMessages
    ? "撤销最近一条演示星火"
    : "请先增加一条演示星火";
}

sparkDemoButton.addEventListener("click", () => {
  if (sparkDemoButton.disabled) return;
  const item = {
    id: `demo-${Date.now()}-${demoSparkIndex}`,
    name: "演示星火",
    message: demoSparkMessages[demoSparkIndex % demoSparkMessages.length],
    createdAt: new Date().toISOString(),
    isLocal: true,
  };
  demoSparkIndex += 1;
  if (!writeLocalMessages([item, ...readLocalMessages()])) {
    showToast("演示星火没有保存，请检查浏览器存储权限");
    return;
  }
  communityMessages = [item, ...communityMessages.filter((message) => message.id !== item.id)];
  renderMessages(communityMessages, { ignite: true });
  const percent = Math.round(
    (Math.min(sparkPositions.length, communityMessages.length + seedMessages.length) / sparkPositions.length) * 100,
  );
  showToast(`演示星火已点亮，路线推进到 ${percent}%`);
});

sparkDemoRemoveButton.addEventListener("click", () => {
  const localMessages = readLocalMessages();
  const demoIndex = localMessages.findIndex((message) => message.id.startsWith("demo-"));
  if (demoIndex < 0) return;
  const [removed] = localMessages.splice(demoIndex, 1);
  if (!writeLocalMessages(localMessages)) {
    showToast("演示星火没有收回，请检查浏览器存储权限");
    return;
  }
  demoSparkIndex = Math.max(0, demoSparkIndex - 1);
  communityMessages = communityMessages.filter((message) => message.id !== removed.id);
  renderMessages(communityMessages);
  const percent = Math.round(
    (Math.min(sparkPositions.length, communityMessages.length + seedMessages.length) / sparkPositions.length) * 100,
  );
  showToast(`演示星火已收回，路线回到 ${percent}%`);
});

function renderMessages(items, { ignite = false } = {}) {
  const totalMessages = Math.min(items.length + seedMessages.length, 33);
  messageList.replaceChildren(...[...items, ...seedMessages].slice(0, 33).map(buildMessageItem));
  messageCount.textContent = String(totalMessages);
  updateSparkAtmosphere(totalMessages, ignite);
}

function findMessageById(id) {
  return communityMessages.find((message) => message.id === id)
    || seedMessages.find((message) => message.id === id);
}

async function likeMessage(button) {
  const id = button.dataset.messageId;
  const item = findMessageById(id);
  if (!item || likedMessageIds.has(id) || button.disabled) return;

  button.disabled = true;
  button.setAttribute("aria-busy", "true");

  try {
    if (item.isSeed || item.isLocal || !serverAvailable) {
      likedMessageIds.add(id);
      likeDeltas[id] = (likeDeltas[id] || 0) + 1;
      persistLikeState();
      showToast("点赞已保存在本机");
      return;
    }

    const response = await fetchWithTimeout(`/api/messages/${encodeURIComponent(id)}/like`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "点赞没有保存，请稍后再试。");
    item.likes = Math.max(0, Math.floor(Number(result.message?.likes) || 0));
    likedMessageIds.add(id);
    delete likeDeltas[id];
    persistLikeState();
    showToast("又点亮了一点星火");
  } catch {
    likedMessageIds.add(id);
    likeDeltas[id] = (likeDeltas[id] || 0) + 1;
    persistLikeState();
    showToast("网络暂不可用，点赞已保存在本机");
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    updateLikeButton(button, item);
  }
}

messageList.addEventListener("click", (event) => {
  const button = event.target.closest(".message-like");
  if (button) likeMessage(button);
});

async function loadMessages() {
  const localMessages = readLocalMessages().map((message) => ({ ...message, isLocal: true }));
  communityMessages = localMessages;
  renderMessages(communityMessages);

  if (localPreview) sparkDemoActions.hidden = false;

  if (location.protocol === "file:") {
    storageNote.textContent = "本地预览：初始显示 3 条策展寄语；新留言只保存在这台设备。";
    return;
  }

  try {
    const response = await fetchWithTimeout("/api/messages", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("API_UNAVAILABLE");
    const data = await response.json();
    const serverMessages = Array.isArray(data.messages) ? data.messages : [];
    const serverIds = new Set(serverMessages.map((message) => message.id));
    communityMessages = [...localMessages.filter((message) => !serverIds.has(message.id)), ...serverMessages].sort(
      (left, right) => (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0),
    );
    serverAvailable = true;
    storageNote.textContent = localMessages.length
      ? `其中 ${localMessages.length} 条仅保存在这台设备；新留言会保存到项目服务器。`
      : "新留言会保存到项目服务器，并显示在共享星火墙。";
    renderMessages(communityMessages);
  } catch {
    serverAvailable = false;
    storageNote.textContent = "服务器暂不可用，留言会先保存在这台设备。";
  }
}

function setFormError(message) {
  formStatus.textContent = message;
  messageInput.setAttribute("aria-invalid", "true");
  messageInput.focus();
}

messageInput.addEventListener("input", () => {
  const count = Array.from(messageInput.value).length;
  characterCount.textContent = `${count} / 60`;
  if (messageInput.getAttribute("aria-invalid") === "true") {
    messageInput.removeAttribute("aria-invalid");
    formStatus.textContent = "";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const validation = validateMessage(data);
  if (!validation.ok) {
    setFormError(validation.error);
    return;
  }

  submitButton.disabled = true;
  formStatus.textContent = "正在点亮…";

  try {
    let item;
    if (serverAvailable) {
      const response = await fetchWithTimeout("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(validation.value),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(result.error || "留言没有保存，请稍后再试。");
        error.userFacing = true;
        throw error;
      }
      item = result.message;
    } else {
      item = {
        id: crypto.randomUUID?.() || `local-${Date.now()}`,
        ...validation.value,
        createdAt: new Date().toISOString(),
        isLocal: true,
      };
      const localMessages = [item, ...readLocalMessages()];
      if (!writeLocalMessages(localMessages)) throw new Error("LOCAL_STORAGE_UNAVAILABLE");
      storageNote.textContent = "星火已保存在这台设备；当前未连接共享服务器。";
    }

    communityMessages = [item, ...communityMessages.filter((message) => message.id !== item.id)];
    renderMessages(communityMessages, { ignite: true });
    form.reset();
    characterCount.textContent = "0 / 60";
    formStatus.textContent = "星火已点亮。谢谢你把它传下去。";
    showToast("星火已点亮");
  } catch (error) {
    if (error.userFacing) {
      formStatus.textContent = error.message;
    } else {
      const item = {
        id: `local-${Date.now()}`,
        ...validation.value,
        createdAt: new Date().toISOString(),
        isLocal: true,
      };
      const localMessages = [item, ...readLocalMessages()];
      if (!writeLocalMessages(localMessages)) {
        formStatus.textContent = "网络不可用，浏览器也无法保存留言。请保持页面打开并稍后重试。";
        return;
      }
      serverAvailable = false;
      storageNote.textContent = "服务器暂不可用，后续留言会先保存在这台设备；恢复连接后刷新页面可继续共享。";
      communityMessages = [item, ...communityMessages];
      renderMessages(communityMessages, { ignite: true });
      form.reset();
      characterCount.textContent = "0 / 60";
      formStatus.textContent = "网络暂不可用，星火已先保存在这台设备。";
    }
  } finally {
    submitButton.disabled = false;
  }
});

loadMessages();

/* =========================================================
   Finale stars and toast
   ========================================================= */
const finaleStars = $("#finale-stars");
for (let index = 0; index < 76; index += 1) {
  const star = document.createElement("span");
  star.className = "finale-star";
  star.style.setProperty("--x", `${Math.random() * 100}%`);
  star.style.setProperty("--y", `${Math.random() * 100}%`);
  star.style.setProperty("--size", `${0.8 + Math.random() * 2.2}px`);
  star.style.setProperty("--opacity", String(0.14 + Math.random() * 0.45));
  star.style.setProperty("--duration", `${2.8 + Math.random() * 5}s`);
  star.style.setProperty("--delay", `${-Math.random() * 5}s`);
  finaleStars.append(star);
}

let toastTimer = 0;
const toast = $("#toast");

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && soundscape.enabled && soundscape.context) {
    soundscape.context.suspend();
  } else if (!document.hidden && soundscape.enabled && soundscape.context) {
    soundscape.context.resume();
  }
});
