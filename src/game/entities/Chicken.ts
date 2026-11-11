import Phaser from 'phaser';
import type { Student } from '../../types';
import { GAME_CONFIG } from '../config/gameConfig';
import { rand, randInt } from '../utils/random';
import { FACE_CX, FACE_H, FACE_W, faceKey, type FaceName } from './ChickenTextures';

export type ChickenState = 'IDLE' | 'WALK' | 'FLEE' | 'CAPTURED' | 'IN_POT' | 'ESCAPING' | 'COOKED';
export interface Bounds { minX: number; maxX: number; minY: number; maxY: number; }
export interface Solid { x: number; y: number; rx: number; ry: number; } // vật cản hình elip (bếp)
export interface PlayArea { bounds: Bounds; avoid: Array<{ x: number; y: number; r: number }>; solids: Solid[]; }

export function isBlocked(area: PlayArea, x: number, y: number): boolean {
  return area.avoid.some((a) => Math.hypot(x - a.x, y - a.y) < a.r)
    || area.solids.some((o) => Math.hypot((x - o.x) / (o.rx * 1.2), (y - o.y) / (o.ry * 1.2)) < 1);
}

const BASE_SCALE = 0.7;
export const CHICKEN_LABEL_Y = 76; // nhãn tên nằm cách chân gà bấy nhiêu px

/**
 * Gà chibi gồm: thân + cánh (xoay riêng để vỗ) + mặt (đổi biểu cảm).
 * Biểu cảm: normal, blink, panic, tease (lè lưỡi), happy, dizzy, angry, cry, squawk.
 */
export class Chicken extends Phaser.GameObjects.Container {
  readonly studentId: string;
  readonly studentName: string;
  readonly sprite: Phaser.GameObjects.Container; // phần hiển thị (gốc ở chân gà)
  chickenState: ChickenState = 'IDLE';
  escaped = false;      // đã trốn thoát trong vòng hiện tại
  immuneMs = 0;         // không bị chộp trong thời gian này
  teaseMs = 0;          // đang trêu chọc (do game ép), không bỏ chạy
  flapMs = 0;           // vỗ cánh
  labelW = 100;         // kích thước nhãn tên (do LabelLayer cập nhật), dùng để giãn gà
  labelH = 26;
  onSay: ((text: string, x: number, y: number) => void) | null = null;
  speed: number;

  private wing: Phaser.GameObjects.Image;
  private face: Phaser.GameObjects.Image;
  private faceName: FaceName = 'normal';
  private flip = 1;
  private qx = 1;
  private qy = 1;
  private target = new Phaser.Math.Vector2();
  private waitMs = rand(200, 2000);
  private danceMs = 0;
  private calmMs = 0;
  private t = rand(0, 6);
  private idleVariant = 0;
  private blinkIn = rand(1.5, 4);
  private blinkLeft = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, student: Student, textureKey: string, private area: PlayArea) {
    super(scene, x, y);
    this.studentId = student.id;
    this.studentName = student.name;
    this.speed = GAME_CONFIG.chicken.speed * rand(0.8, 1.25);

    const shadow = scene.add.ellipse(0, -2, 46, 13, 0x000000, 0.25);
    const body = scene.add.image(0, 0, textureKey).setOrigin(0.5, 1);
    this.wing = scene.add.image(4, -52, `${textureKey}_wing`).setOrigin(0.85, 0.2);
    this.face = scene.add.image(16, -64, faceKey('normal')).setOrigin(FACE_CX / FACE_W, 0.5);
    void FACE_H;
    this.sprite = scene.add.container(0, 0, [body, this.wing, this.face]);
    this.flip = Math.random() > 0.5 ? 1 : -1;
    this.applyScale();

    this.add([shadow, this.sprite]);
    scene.add.existing(this);
    this.setDepth(y);
    this.enterIdle();
  }

  // ---------- trạng thái ----------
  get isRoaming(): boolean { return this.chickenState === 'IDLE' || this.chickenState === 'WALK'; }
  get canBeScared(): boolean {
    return (this.chickenState === 'IDLE' || this.chickenState === 'WALK' || this.chickenState === 'FLEE') && this.teaseMs <= 0;
  }

  setFace(n: FaceName): void {
    if (n === this.faceName) return;
    this.faceName = n;
    this.face.setTexture(faceKey(n));
  }
  setFacingLeft(left: boolean): void { this.flip = left ? -1 : 1; this.applyScale(); }
  private applyScale(): void { this.sprite.setScale(this.flip * BASE_SCALE * this.qx, BASE_SCALE * this.qy); }
  private squash(qx: number, qy: number): void { this.qx = qx; this.qy = qy; this.applyScale(); }
  private resetPose(): void { this.sprite.setAngle(0); this.sprite.y = 0; this.squash(1, 1); }

  private enterIdle(): void {
    this.chickenState = 'IDLE';
    this.idleVariant = randInt(0, 4);
    this.waitMs = rand(900, 3000);
    this.danceMs = 0;
    if (this.idleVariant === 4) {
      this.danceMs = this.waitMs; // lắc mông trêu chọc
      if (Math.random() < 0.3) this.onSay?.('Lêu lêu!', this.x, this.y - 118);
    }
  }

  /** Trêu chọc (lè lưỡi, lắc mông) trong ms mili giây, không bỏ chạy. */
  tease(ms: number): void {
    this.chickenState = 'IDLE';
    this.teaseMs = ms;
    this.waitMs = ms + 300;
    this.idleVariant = 0;
  }

  /** Đứng im hoảng sợ (bị chộp). */
  freeze(): void { this.chickenState = 'FLEE'; this.calmMs = 1500; }

  private pickTarget(): void {
    const b = this.area.bounds;
    for (let i = 0; i < 12; i++) {
      const x = rand(b.minX, b.maxX), y = rand(b.minY, b.maxY);
      if (!isBlocked(this.area, x, y)) { this.target.set(x, y); return; }
    }
    this.target.set(this.x, this.y);
  }

  private blink(s: number): FaceName {
    this.blinkIn -= s;
    if (this.blinkIn <= 0) { this.blinkLeft = 0.12; this.blinkIn = rand(2, 5); }
    if (this.blinkLeft > 0) { this.blinkLeft -= s; return 'blink'; }
    return 'normal';
  }

  // ---------- cập nhật ----------
  tick(dt: number): void {
    const s = dt / 1000;
    this.t += s;
    switch (this.chickenState) {
      case 'IDLE': this.idleTick(dt, s); break;
      case 'WALK': this.walkTick(s); break;
      case 'FLEE':
        this.calmMs -= dt;
        this.setFace('panic');
        this.sprite.angle = Math.sin(this.t * 25) * 8;
        this.sprite.y = -Math.abs(Math.sin(this.t * 12)) * 4;
        if (this.calmMs <= 0) { this.enterIdle(); this.resetPose(); }
        break;
      case 'CAPTURED':
        this.setFace(Math.floor(this.t * 4) % 2 === 0 ? 'dizzy' : 'squawk');
        this.sprite.angle = Math.sin(this.t * 22) * 16;
        this.sprite.y = 0;
        break;
      default: break;
    }
    this.animateWing(dt);
  }

  private idleTick(dt: number, s: number): void {
    this.waitMs -= dt;
    if (this.teaseMs > 0) {
      this.teaseMs -= dt;
      this.setFace('tease');
      this.sprite.angle = Math.sin(this.t * 20) * 12;
      this.sprite.y = -Math.abs(Math.sin(this.t * 10)) * 6;
      this.squash(1 + Math.sin(this.t * 20) * 0.05, 1 - Math.sin(this.t * 20) * 0.04);
      return;
    }
    if (this.danceMs > 0) {
      this.danceMs -= dt;
      this.setFace('tease');
      this.sprite.angle = Math.sin(this.t * 18) * 10;
      this.sprite.y = -Math.abs(Math.sin(this.t * 9)) * 5;
      this.squash(1 + Math.sin(this.t * 18) * 0.05, 1);
    } else {
      this.setFace(this.idleVariant === 3 ? 'happy' : this.blink(s));
      const v = this.idleVariant;
      this.squash(1, 1 + Math.sin(this.t * 4) * 0.03);
      this.sprite.angle = v === 1 ? Math.sin(this.t * 6) * 8 : 0;
      this.sprite.y = v === 2 ? -Math.abs(Math.sin(this.t * 5)) * 7 : v === 3 ? -Math.abs(Math.sin(this.t * 8)) * 4 : 0;
    }
    if (this.waitMs <= 0) { this.chickenState = 'WALK'; this.danceMs = 0; this.pickTarget(); this.resetPose(); }
  }

  private walkTick(s: number): void {
    const dx = this.target.x - this.x, dy = this.target.y - this.y;
    const d = Math.hypot(dx, dy);
    this.setFace(this.blink(s));
    if (d < 4) { this.enterIdle(); this.resetPose(); }
    else {
      const step = Math.min(d, this.speed * s);
      this.x += (dx / d) * step; this.y += (dy / d) * step;
      if (Math.abs(dx) > 1) this.setFacingLeft(dx < 0);
      this.sprite.y = -Math.abs(Math.sin(this.t * 10)) * 5;
      this.sprite.angle = Math.sin(this.t * 10) * 6;
    }
    this.clampToBounds();
  }

  private animateWing(dt: number): void {
    if (this.flapMs > 0) this.flapMs -= dt;
    const st = this.chickenState;
    const frantic = st === 'FLEE' || st === 'CAPTURED' || st === 'ESCAPING' || this.flapMs > 0
      || (st === 'IDLE' && (this.idleVariant === 3 || this.danceMs > 0 || this.teaseMs > 0));
    if (frantic) this.wing.angle = -35 + Math.sin(this.t * 38) * 30;
    else if (st === 'WALK') this.wing.angle = Math.sin(this.t * 10) * 7;
    else this.wing.angle = Math.sin(this.t * 3) * 2;
  }

  /** Hoảng loạn bỏ chạy khỏi (fx, fy). Gần mép sân thì vòng vào giữa để không kẹt góc mãi. */
  flee(fx: number, fy: number, dt: number, boost: number, cx: number, cy: number): void {
    const s = dt / 1000;
    this.t += s;
    this.chickenState = 'FLEE';
    this.calmMs = 600;
    this.danceMs = 0;
    let dx = this.x - fx, dy = this.y - fy;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const b = this.area.bounds, m = 55;
    const near = this.x < b.minX + m || this.x > b.maxX - m || this.y < b.minY + m / 2 || this.y > b.maxY - m / 2;
    if (near) {
      const tx = cx - this.x, ty = cy - this.y, td = Math.hypot(tx, ty) || 1;
      dx += (tx / td) * 0.9; dy += (ty / td) * 0.9;
      const px = -dy, py = dx;
      dx += px * 0.5; dy += py * 0.5;
      const n = Math.hypot(dx, dy) || 1;
      dx /= n; dy /= n;
    }
    const sp = GAME_CONFIG.chicken.runSpeed * boost;
    this.x += dx * sp * s; this.y += dy * sp * s;
    if (Math.abs(dx) > 0.05) this.setFacingLeft(dx < 0);
    this.setFace('panic');
    this.sprite.y = -Math.abs(Math.sin(this.t * 18)) * 8;
    this.sprite.angle = Math.sin(this.t * 18) * 10;
    this.squash(1, 1);
    this.clampToBounds();
    this.animateWing(dt);
  }

  // ---------- bị bắt / nồi / trốn thoát ----------
  capture(): void {
    this.chickenState = 'CAPTURED';
    this.resetPose();
  }

  dropInto(x: number, y: number): void {
    this.chickenState = 'IN_POT';
    this.setFace('squawk');
    this.scene.tweens.add({
      targets: this, x, y, scale: 0.5, duration: 450, ease: 'Sine.easeIn',
      onUpdate: () => this.setDepth(this.y),
      onComplete: () => { this.setVisible(false); },
    });
  }

  /** Chui ra khỏi nồi, nhảy tới (lx, ly), lè lưỡi trêu rồi tiếp tục đi lang thang. */
  popOut(sx: number, sy: number, lx: number, ly: number): void {
    this.scene.tweens.killTweensOf([this, this.sprite]);
    this.escaped = true;
    this.chickenState = 'ESCAPING';
    this.setVisible(true).setAlpha(1).setScale(1).setPosition(sx, sy);
    this.setFacingLeft(lx < sx);
    this.sprite.setAngle(0);
    this.setFace('squawk');
    this.scene.tweens.add({ targets: this.sprite, y: -85, yoyo: true, duration: 380, ease: 'Quad.easeOut' });
    this.scene.tweens.add({
      targets: this, x: lx, y: ly, duration: 760, ease: 'Sine.easeOut',
      onUpdate: () => this.setDepth(this.y),
      onComplete: () => {
        this.sprite.y = 0;
        this.tease(1800);
        this.onSay?.(['Bye bye!', 'Lêu lêu!', 'Tạm biệt nha!'][randInt(0, 2)], this.x, this.y - 118);
      },
    });
  }

  markCooked(): void {
    this.scene.tweens.killTweensOf([this, this.sprite]);
    this.chickenState = 'COOKED';
    this.setVisible(false);
  }

  /** Đưa về trạng thái ban đầu cho vòng mới. */
  resetState(): void {
    this.scene.tweens.killTweensOf([this, this.sprite]);
    this.escaped = false; this.immuneMs = 0; this.teaseMs = 0; this.flapMs = 0;
    this.setVisible(true).setAlpha(1).setScale(1);
    this.resetPose();
    this.setFace('normal');
    this.enterIdle();
    this.waitMs = rand(200, 1500);
  }

  nudge(ox: number, oy: number): void {
    this.x += ox; this.y += oy;
    this.clampToBounds();
  }

  clampToBounds(): void {
    const b = this.area.bounds;
    this.x = Phaser.Math.Clamp(this.x, b.minX, b.maxX);
    this.y = Phaser.Math.Clamp(this.y, b.minY, b.maxY);
    // Bếp là vật cản cứng: gà không thể đi vào, bị đẩy ra rìa (không được thì đẩy lên phía trên bếp)
    for (const o of this.area.solids) {
      const nx = (this.x - o.x) / o.rx, ny = (this.y - o.y) / o.ry, d = Math.hypot(nx, ny);
      if (d >= 1) continue;
      const ux = d > 0.001 ? nx / d : -1, uy = d > 0.001 ? ny / d : 0;
      this.x = Phaser.Math.Clamp(o.x + ux * o.rx, b.minX, b.maxX);
      this.y = Phaser.Math.Clamp(o.y + uy * o.ry, b.minY, b.maxY);
      const cx = (this.x - o.x) / o.rx, cy = (this.y - o.y) / o.ry;
      if (Math.hypot(cx, cy) < 1) this.y = o.y - o.ry * Math.sqrt(Math.max(0, 1 - cx * cx));
    }
    this.setDepth(this.y);
  }
}
