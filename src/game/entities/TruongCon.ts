import Phaser from 'phaser';
import { TC_ANCHOR, TC_CANVAS, TC_RUN, TC_STAND_H } from '../config/frames';
import { TC_CUSTOM_ANIMS, TC_CUSTOM_TARGET_H } from '../config/tcAnimConfig';

export type TCAnim =
  | 'idle' | 'walk' | 'run' | 'catch' | 'miss' | 'carry'
  | 'putInPot' | 'holdPot' | 'surprise' | 'frustrated' | 'victory';
export type TCMood = 'normal' | 'rage' | 'shock' | 'sad' | 'smug' | 'dizzy' | 'excited' | 'strain';

const DEFAULT_MOOD: Record<TCAnim, TCMood> = {
  idle: 'normal', walk: 'normal', run: 'smug', catch: 'normal', miss: 'dizzy', carry: 'smug',
  putInPot: 'smug', holdPot: 'strain', surprise: 'shock', frustrated: 'rage', victory: 'excited',
};
const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
type OverlayKey = 'anger' | 'bang' | 'sweat' | 'star0' | 'star1' | 'star2' | 'spark0' | 'spark1';

interface Pose { x: number; y: number; angle: number; sx: number; sy: number; }

/** Phối cảnh giả 3D: nhân vật ở gần đáy sân to hơn một chút, ở xa nhỏ hơn. */
export function depthScale(y: number): number {
  return 0.78 * (0.9 + 0.2 * Phaser.Math.Clamp((y - 200) / 520, 0, 1)); // 0.78: thu nhỏ chung để sân thoáng hơn
}

/**
 * Nhân vật chính, dùng đúng các khung hình bạn cung cấp:
 *  - chạy/đi/mang gà/bổ nhào: chu kỳ chạy 8 khung nhìn ngang (lật theo hướng chạy)
 *  - các biểu cảm: tư thế nhìn thẳng (bình thường, vẫy tay, cười, giận, ngạc nhiên, sợ, bối rối, buồn, phấn khích, chiến thắng)
 * Cảm giác 3D bổ sung bằng code: nảy người, nhảy bổ, ngã sấp, co người khi xoay hướng,
 * bóng đổ co theo độ cao và kích thước theo độ sâu của sân.
 */
export class TruongCon extends Phaser.GameObjects.Container {
  readonly rig: Phaser.GameObjects.Container;
  anim: TCAnim = 'idle';
  mood: TCMood = 'normal';
  facing = 1;
  moving = false; // đang di chuyển trong frame vừa rồi (để đàn gà biết có bước chân)
  private movedFlag = false;
  private playing = ''; // khóa animation tùy chỉnh đang chạy ('' = dùng khung hình có sẵn)
  private customOn = false;
  private sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;
  private s: number;
  private key = '';
  private animT = 0;
  private moodT = 0;
  private lastFacing = 1;
  private turnT = 0;
  private pose: Pose = { x: 0, y: 0, angle: 0, sx: 1, sy: 1 };
  private ov!: Record<OverlayKey, Phaser.GameObjects.Text>;

  constructor(scene: Phaser.Scene, x: number, y: number, height = 230) {
    super(scene, x, y);
    this.shadow = scene.add.ellipse(0, -2, 120, 26, 0x000000, 0.3);
    this.sprite = scene.add.sprite(0, 0, 'tc_normal').setOrigin(TC_ANCHOR[0] / TC_CANVAS[0], TC_ANCHOR[1] / TC_CANVAS[1]);
    this.s = height / TC_STAND_H;
    this.sprite.setScale(this.s);
    this.rig = scene.add.container(0, 0, [this.sprite]);

    const mk = (ch: string, size: number) => {
      const t = scene.add.text(0, 0, ch, { fontFamily: EMOJI_FONT, fontSize: `${size}px` }).setOrigin(0.5).setVisible(false);
      this.rig.add(t);
      return t;
    };
    this.ov = {
      anger: mk('💢', 40), bang: mk('❗', 46), sweat: mk('💦', 34),
      star0: mk('⭐', 28), star1: mk('⭐', 28), star2: mk('⭐', 28),
      spark0: mk('✨', 34), spark1: mk('✨', 34),
    };

    this.add([this.shadow, this.rig]);
    scene.add.existing(this);
    this.setDepth(y);
  }

  setAnim(a: TCAnim, mood?: TCMood): void {
    if (this.anim !== a) { this.anim = a; this.animT = 0; }
    this.setMood(mood ?? DEFAULT_MOOD[a]);
  }

  setMood(m: TCMood): void {
    if (m === this.mood) return;
    this.mood = m;
    this.moodT = 0;
    for (const k of Object.keys(this.ov) as OverlayKey[]) this.ov[k].setVisible(false).setAlpha(1);
  }

  face(dx: number): void {
    if (Math.abs(dx) > 1) this.facing = dx > 0 ? 1 : -1;
  }

  /** Vị trí tay cầm gà (toạ độ thế giới): ngay trước nắm đấm khi chạy/đi. */
  handPoint(): { x: number; y: number } {
    const k = this.scaleX;
    return { x: this.x + this.facing * 52 * k, y: this.y + (this.rig.y - 72) * k };
  }

  /** Di chuyển từ từ về đích (không dịch chuyển tức thời). Trả về true khi đã tới. */
  moveToward(tx: number, ty: number, speed: number, dt: number): boolean {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    this.face(dx);
    if (d < 4) return true;
    this.movedFlag = true;
    const step = Math.min(d, speed * dt / 1000);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    this.setDepth(this.y);
    return d - step < 4;
  }

  /** Dùng animation do bạn cung cấp (chạy/đi) nếu đã khai báo trong tcAnimConfig.ts và nạp được. */
  private tryCustom(name: 'run' | 'walk'): boolean {
    const def = TC_CUSTOM_ANIMS[name];
    const ak = `tc-${name}`;
    if (!def || !this.scene.anims.exists(ak)) return false;
    if (this.playing !== ak) {
      this.playing = ak;
      this.sprite.play(ak, true);
      const h = this.sprite.frame.realHeight || this.sprite.height;
      this.sprite.setOrigin(0.5, def.originY ?? 0.95);
      this.sprite.setScale((TC_CUSTOM_TARGET_H / h) * (def.scale ?? 1));
      this.key = '';
    }
    this.sprite.setFlipX(def.facing === 'left' ? this.facing > 0 : this.facing < 0);
    return true;
  }

  private stopCustom(): void {
    this.sprite.anims.stop();
    this.playing = '';
    this.key = '';
    this.sprite.setOrigin(TC_ANCHOR[0] / TC_CANVAS[0], TC_ANCHOR[1] / TC_CANVAS[1]);
    this.sprite.setScale(this.s);
  }

  tick(dt: number): void {
    this.animT += dt / 1000;
    this.moodT += dt / 1000;
    this.moving = this.movedFlag; this.movedFlag = false;
    this.customOn = false;
    const f = this.facing, t = this.animT, p = this.pose;
    p.x = 0; p.y = 0; p.angle = 0; p.sx = 1; p.sy = 1;
    const sin = Math.sin, abs = Math.abs, max = Math.max, PI = Math.PI;
    const cycle = (fps: number) => TC_RUN[Math.floor(t * fps) % TC_RUN.length];
    let key: string = 'normal';
    let side = false; // khung nhìn ngang: cần lật theo hướng

    switch (this.anim) {
      case 'idle':
        key = this.mood === 'smug' ? 'happy' : this.mood === 'sad' ? 'sad' : this.mood === 'excited' ? 'excited' : 'normal';
        p.sy = 1 + sin(t * 3.2) * 0.015; p.sx = 1 - sin(t * 3.2) * 0.006;
        break;
      case 'walk':
      case 'carry':
        if (this.tryCustom('walk') || this.tryCustom('run')) this.customOn = true;
        else { key = cycle(10); side = true; }
        p.y = -abs(sin(PI * t * 10 / 4)) * 4; p.angle = this.anim === 'carry' ? -f * 2 : f * 2;
        break;
      case 'run':
        if (this.tryCustom('run')) this.customOn = true;
        else { key = cycle(16); side = true; }
        p.y = -abs(sin(PI * t * 16 / 4)) * 7; p.angle = f * 4;
        break;
      case 'catch': { // ngồi thấp lấy đà -> nhảy bổ -> tiếp đất kéo gà vào người
        side = true;
        if (t < 0.14) {
          const k = t / 0.14;
          key = 'run5'; p.sy = 1 - 0.1 * k; p.x = -f * 6 * k;
        } else if (t < 0.46) {
          const q = (t - 0.14) / 0.32, arc = sin(q * PI);
          key = 'run1'; p.y = -62 * arc; p.x = f * 40 * q; p.angle = f * 16 * arc;
        } else {
          const k = Math.min(1, (t - 0.46) / 0.09);
          key = 'run4'; p.sy = 0.9 + 0.1 * k; p.x = f * 40;
        }
        break;
      }
      case 'miss': { // ngã sấp như Superman, quơ quào, rồi đứng dậy ngơ ngác
        const fall = Math.min(1, t / 0.18);
        if (t < 0.9) {
          key = 'run1'; side = true;
          p.angle = f * 80 * fall + sin(t * 30) * 3 * fall; p.x = f * 34 * fall;
        } else if (t < 1.05) {
          key = 'run1'; side = true;
          const q = (t - 0.9) / 0.15;
          p.angle = f * 80 * (1 - q); p.x = f * 34 * (1 - q);
        } else {
          key = 'confused';
          const q = Math.min(1, (t - 1.05) / 0.25);
          p.sy = 0.85 + 0.15 * q;
        }
        break;
      }
      case 'putInPot': // cười đắc ý
        key = 'laughing';
        p.angle = f * 8 + sin(t * 8) * 2; p.y = -abs(sin(t * 6)) * 4;
        break;
      case 'holdPot': // gồng giữ nắp nồi
        key = 'angry';
        p.angle = f * 4; p.x = sin(t * 35) * 2.5; p.y = sin(t * 28) * 2;
        break;
      case 'surprise': { // hoảng hồn khi gà bật nắp
        key = 'scared';
        const k = sin(Math.min(1, t / 0.4) * PI);
        p.y = -26 * k; p.sy = 1 + 0.06 * max(0, 1 - t * 3); p.angle = sin(t * 30) * 4 * max(0, 1 - t);
        break;
      }
      case 'frustrated':
        if (this.mood === 'sad') { key = 'sad'; p.angle = sin(t * 2) * 1.5; }
        else { key = 'angry'; p.x = sin(t * 22) * 3; p.y = -6 * max(0, sin(t * 10)); p.sy = 0.98; }
        break;
      case 'victory':
        if (t < 1.0) { key = 'excited'; p.y = -abs(sin(t * 6)) * 42; p.sy = 1 + sin(t * 12) * 0.03; }
        else { key = 'victory'; p.y = -abs(sin(t * 4)) * 3; }
        break;
    }

    // Biểu cảm bổ sung (icon meme)
    const m = this.moodT, o = this.ov;
    switch (this.mood) {
      case 'rage':
        o.anger.setVisible(true).setPosition(52, -222).setScale(1 + 0.25 * abs(sin(m * 10)));
        break;
      case 'shock':
        o.bang.setVisible(true).setPosition(0, -268 - abs(sin(m * 8)) * 6);
        break;
      case 'strain': {
        const q = (m * 70) % 46;
        o.sweat.setVisible(true).setPosition(50, -200 + q).setAlpha(1 - q / 46);
        break;
      }
      case 'dizzy':
        [o.star0, o.star1, o.star2].forEach((s, i) => {
          const a = m * 6 + i * 2.094;
          s.setVisible(true).setPosition(Math.cos(a) * 46, -240 + sin(a) * 12);
        });
        break;
      case 'excited':
        if (this.anim === 'victory') {
          o.spark0.setVisible(true).setPosition(-74, -200 + sin(m * 6) * 10);
          o.spark1.setVisible(true).setPosition(74, -170 + sin(m * 6 + 2) * 10);
        }
        break;
      default: break;
    }

    // Đổi hướng: co người một nhịp để giống xoay người trong không gian 3D
    if (f !== this.lastFacing) { this.lastFacing = f; this.turnT = 0.16; }
    let turn = 1;
    if (this.turnT > 0) { this.turnT -= dt / 1000; turn = 1 - 0.3 * sin(PI * (1 - max(0, this.turnT) / 0.16)); }

    if (!this.customOn && this.playing) this.stopCustom();
    if (!this.customOn) {
      if (key !== this.key) { this.key = key; this.sprite.setTexture(`tc_${key}`); }
      this.sprite.setFlipX(side && f < 0);
    }
    this.rig.setPosition(p.x, p.y).setAngle(p.angle).setScale(p.sx * turn, p.sy);

    // Bóng đổ co lại khi nhảy cao, dài ra khi ngã; kích thước theo độ sâu của sân
    const lift = max(0, -p.y), sc = 1 / (1 + lift / 160);
    this.shadow.setScale(sc * (1 + (abs(p.angle) / 90) * 0.9), sc).setAlpha(0.12 + 0.2 * sc);
    this.setScale(depthScale(this.y));
  }
}
