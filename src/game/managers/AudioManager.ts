import type { Settings } from '../../types';

/**
 * Các sự kiện có âm thanh. Muốn dùng âm thanh của bạn: bỏ file (mp3/ogg/wav/m4a) vào thư mục
 *   src/assets/audio/<tên sự kiện>/
 * Một sự kiện có thể có nhiều file (bao nhiêu cũng được): mỗi lần xảy ra sẽ chọn ngẫu nhiên một file.
 * Thư mục trống thì game dùng âm thanh tự tạo có sẵn (hoặc im lặng với sự kiện không có sẵn).
 *   appear  : Trường Con xuất hiện       catch   : bắt được gà          miss  : bắt hụt
 *   escape  : gà thoát khỏi nồi          angry   : Trường Con tức giận  cooked: luộc xong gà
 *   chase   : khi đang lùa gà            putInPot: bỏ gà vào nồi        sad   : hết lượt không bắt được
 *   bgm     : nhạc nền                   cluck/flap/rattle/lidPop/boing/fall: hiệu ứng nhỏ (gà kêu, vỗ cánh, nồi rung, nắp bật...)
 */
export const SFX_KEYS = [
  'bgm', 'appear', 'catch', 'miss', 'escape', 'angry', 'cooked', 'chase', 'putInPot', 'sad',
  'cluck', 'flap', 'rattle', 'lidPop', 'boing', 'fall',
] as const;
export type SfxKey = (typeof SFX_KEYS)[number];
// Các sự kiện thuộc nhóm "lồng tiếng" (còn lại là "hiệu ứng")
const VOICE_KEYS = new Set<SfxKey>(['appear', 'catch', 'miss', 'escape', 'angry', 'cooked', 'chase', 'putInPot', 'sad']);
const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|aac|flac|opus|webm)$/i; // không phân biệt hoa/thường

// Vite tự gom mọi file âm thanh trong src/assets/audio (đúng đường dẫn cả khi deploy lên GitHub Pages)
const AUDIO_URLS = import.meta.glob<string>(['../../assets/audio/**/*', '!../../assets/audio/**/*.txt'], { eager: true, query: '?url', import: 'default' });

/**
 * Âm thanh bằng Web Audio. Có file trong src/assets/audio thì dùng file, không có thì
 * dùng âm thanh tổng hợp tự tạo bằng code (không bản quyền). Không bao giờ ném lỗi.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private dest: AudioNode | null = null; // nơi các âm tổng hợp đang được phát vào (hiệu ứng hoặc lồng tiếng)
  private vols = { bgm: 0.4, sfx: 1, voice: 1.3 };
  private noiseBuf: AudioBuffer | null = null;
  private files = new Map<SfxKey, AudioBuffer[]>();
  private fallbackUrls = new Map<SfxKey, string[]>(); // file giải mã lỗi: phát bằng thẻ <audio>
  private els = new Set<HTMLAudioElement>();
  private lastPick = new Map<SfxKey, number>();
  private bgmSrc: AudioBufferSourceNode | null = null;
  private enabled = true;
  private volume = 0.7;
  private bgmWanted = false;
  private paused = false;

  /** Gọi trong một thao tác bấm của người dùng (trình duyệt yêu cầu mới được phát tiếng). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !this.paused) void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try { this.ctx = new Ctor(); } catch { return; }
    // tổng -> bộ chống vỡ tiếng -> loa; nhạc nền / hiệu ứng / lồng tiếng đi qua 3 kênh riêng
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -8; comp.knee.value = 12; comp.ratio.value = 10;
    comp.connect(this.ctx.destination);
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? this.volume : 0;
    this.master.connect(comp);
    const mk = (v: number): GainNode => { const g = this.ctx!.createGain(); g.gain.value = v; g.connect(this.master!); return g; };
    this.bgmGain = mk(this.vols.bgm);
    this.sfxGain = mk(this.vols.sfx);
    this.voiceGain = mk(this.vols.voice);
    const n = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, n, n);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    void this.loadFiles();
    if (this.bgmWanted) this.startBgm();
  }

  configure(s: Pick<Settings, 'soundOn' | 'volume' | 'bgmVolume' | 'sfxVolume' | 'voiceVolume'>): void {
    this.enabled = s.soundOn;
    this.volume = s.volume;
    this.vols = { bgm: s.bgmVolume, sfx: s.sfxVolume, voice: s.voiceVolume };
    if (this.master) this.master.gain.value = s.soundOn ? s.volume : 0;
    if (this.bgmGain) this.bgmGain.gain.value = this.vols.bgm;
    if (this.sfxGain) this.sfxGain.gain.value = this.vols.sfx;
    if (this.voiceGain) this.voiceGain.gain.value = this.vols.voice;
    if (!s.soundOn) this.stopBgmNode();
    else if (this.bgmWanted) this.startBgm();
  }

  /** Tạm dừng/tiếp tục toàn bộ âm thanh (nhạc nền + hiệu ứng). */
  setPaused(p: boolean): void {
    this.paused = p;
    for (const a of this.els) { if (p) a.pause(); else void a.play().catch(() => undefined); }
    if (!this.ctx) return;
    if (p) void this.ctx.suspend(); else void this.ctx.resume();
  }

  /** Tóm tắt số file đã nạp theo sự kiện (để kiểm tra). */
  summary(): string {
    const parts: string[] = [];
    for (const k of SFX_KEYS) {
      const n = (this.files.get(k)?.length ?? 0) + (this.fallbackUrls.get(k)?.length ?? 0);
      if (n > 0) parts.push(`${k}:${n}`);
    }
    return parts.length > 0 ? parts.join(' ') : 'không có file';
  }

  startBgm(): void {
    this.bgmWanted = true;
    if (!this.ctx || !this.master || !this.enabled || this.bgmSrc) return;
    const src = this.ctx.createBufferSource();
    const custom = this.files.get('bgm');
    src.buffer = custom && custom.length > 0 ? custom[Math.floor(Math.random() * custom.length)] : this.makeBgm();
    src.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = custom && custom.length > 0 ? 1 : 0.32;
    src.connect(g); g.connect(this.bgmGain ?? this.master);
    src.start();
    this.bgmSrc = src;
  }

  stopBgm(): void { this.bgmWanted = false; this.stopBgmNode(); }

  private stopBgmNode(): void {
    if (!this.bgmSrc) return;
    try { this.bgmSrc.stop(); } catch { /* đã dừng */ }
    this.bgmSrc = null;
  }

  play(key: SfxKey): void {
    const c = this.ctx;
    if (!c || !this.master || !this.enabled || this.paused || key === 'bgm') return;
    const voice = VOICE_KEYS.has(key);
    const dest: AudioNode = (voice ? this.voiceGain : this.sfxGain) ?? this.master;
    this.dest = dest;
    const bufs = this.files.get(key);
    if (bufs && bufs.length > 0) {
      // chọn ngẫu nhiên, tránh lặp lại đúng file vừa phát
      let i = Math.floor(Math.random() * bufs.length);
      const last = this.lastPick.get(key);
      if (bufs.length > 1 && i === last) i = (i + 1) % bufs.length;
      this.lastPick.set(key, i);
      const s = c.createBufferSource();
      s.buffer = bufs[i]; s.connect(dest); s.start();
      return;
    }
    const urls = this.fallbackUrls.get(key);
    if (urls && urls.length > 0) {
      const a = new Audio(urls[Math.floor(Math.random() * urls.length)]);
      a.volume = Math.min(1, this.volume * (voice ? this.vols.voice : this.vols.sfx));
      this.els.add(a);
      a.onended = () => { this.els.delete(a); };
      void a.play().catch((e) => console.warn(`[Âm thanh] không phát được "${key}":`, e));
      return;
    }
    this.synth(key);
  }

  // ---------- nạp file âm thanh của bạn ----------
  private async loadFiles(): Promise<void> {
    const c = this.ctx;
    if (!c) return;
    const entries = Object.entries(AUDIO_URLS);
    if (entries.length === 0) {
      console.info('[Âm thanh] không tìm thấy file nào trong src/assets/audio/<sự kiện>/ — dùng âm thanh có sẵn.');
      return;
    }
    for (const [path, url] of entries) {
      if (!AUDIO_EXT.test(path)) continue;
      const m = /assets\/audio\/([^/]+)\//.exec(path);
      const key = m?.[1] as SfxKey | undefined;
      if (!key || !(SFX_KEYS as readonly string[]).includes(key)) {
        console.warn(`[Âm thanh] bỏ qua "${path}": thư mục "${m?.[1] ?? '?'}" không phải tên sự kiện hợp lệ (${SFX_KEYS.join(', ')}).`);
        continue;
      }
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await c.decodeAudioData(await res.arrayBuffer());
        const list = this.files.get(key) ?? [];
        list.push(buf);
        this.files.set(key, list);
      } catch (e) {
        // không giải mã được: vẫn thử phát bằng thẻ <audio> thông thường
        console.warn(`[Âm thanh] không giải mã được "${path}", sẽ phát bằng thẻ <audio>:`, e);
        const list = this.fallbackUrls.get(key) ?? [];
        list.push(url);
        this.fallbackUrls.set(key, list);
      }
    }
    console.info('[Âm thanh] đã nạp:', this.summary());
  }

  // ---------- âm thanh tổng hợp ----------
  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0): void {
    const c = this.ctx!, now = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(this.dest ?? this.master!);
    o.start(now); o.stop(now + dur + 0.03);
  }

  private noise(dur: number, vol: number, hp: number, delay = 0): void {
    const c = this.ctx!, now = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(f); f.connect(g); g.connect(this.dest ?? this.master!);
    src.start(now, Math.random() * 0.5, dur + 0.02);
  }

  private synth(key: SfxKey): void {
    switch (key) {
      case 'cluck': {
        const p = 0.85 + Math.random() * 0.35;
        this.tone('square', 700 * p, 420 * p, 0.07, 0.07);
        this.tone('square', 540 * p, 380 * p, 0.08, 0.06, 0.09);
        break;
      }
      case 'flap': this.noise(0.09, 0.18, 1200); break;
      case 'appear':
        this.tone('square', 523, 523, 0.12, 0.12);
        this.tone('square', 659, 659, 0.12, 0.12, 0.12);
        this.tone('square', 784, 784, 0.12, 0.12, 0.24);
        this.tone('square', 1047, 1047, 0.32, 0.14, 0.36);
        break;
      case 'miss':
        this.tone('sawtooth', 420, 110, 0.6, 0.14);
        this.tone('sawtooth', 432, 116, 0.6, 0.08);
        break;
      case 'catch':
        this.tone('sine', 300, 900, 0.18, 0.22);
        this.noise(0.05, 0.12, 2000);
        break;
      case 'rattle':
        this.noise(0.07, 0.22, 400);
        this.tone('square', 140, 110, 0.06, 0.1);
        break;
      case 'lidPop':
        this.noise(0.18, 0.28, 300);
        this.tone('sine', 220, 60, 0.22, 0.3);
        break;
      case 'cooked':
        [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.22, 0.2, i * 0.12));
        break;
      case 'sad':
        this.tone('triangle', 392, 370, 0.3, 0.2);
        this.tone('triangle', 370, 349, 0.3, 0.2, 0.3);
        this.tone('triangle', 349, 330, 0.3, 0.2, 0.6);
        this.tone('triangle', 330, 196, 0.6, 0.2, 0.9);
        break;
      case 'boing': this.tone('sine', 200, 700, 0.25, 0.22); break;
      case 'fall':
        this.tone('sine', 500, 80, 0.28, 0.28);
        this.noise(0.1, 0.25, 500, 0.2);
        break;
      default: break;
    }
  }

  /** Nhạc nền vui nhộn tự sinh (vòng lặp ~7 giây), không dùng nguồn bên ngoài. */
  private makeBgm(): AudioBuffer {
    const c = this.ctx!;
    const sr = 22050, step = 0.2273; // 132 bpm, nốt móc đơn
    const melody = [72,0,76,0,79,0,76,72, 74,0,77,0,81,0,77,74, 76,0,79,0,83,0,79,76, 74,76,72,0,67,0,72,0];
    const bass = [48,48,55,55,53,53,55,55];
    const len = Math.floor(sr * step * melody.length);
    const buf = c.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
    const tri = (ph: number) => 2 * Math.abs(2 * (ph - Math.floor(ph + 0.5))) - 1;
    for (let i = 0; i < melody.length; i++) {
      const s0 = Math.floor(i * step * sr), n = Math.floor(step * sr);
      if (melody[i]) {
        const f = hz(melody[i]);
        for (let k = 0; k < n && s0 + k < len; k++) d[s0 + k] += tri((k / sr) * f) * Math.exp(-k / sr * 7) * 0.5;
      }
      if (i % 4 === 0) {
        const f = hz(bass[i / 4]);
        for (let k = 0; k < n * 4 && s0 + k < len; k++) {
          const ph = (k / sr) * f;
          d[s0 + k] += (ph - Math.floor(ph) < 0.5 ? 1 : -1) * Math.exp(-k / sr * 3) * 0.16;
        }
      }
      if (i % 2 === 1) {
        for (let k = 0; k < n * 0.25 && s0 + k < len; k++) d[s0 + k] += (Math.random() * 2 - 1) * Math.exp(-k / sr * 60) * 0.1;
      }
    }
    return buf;
  }
}

export const audio = new AudioManager();
