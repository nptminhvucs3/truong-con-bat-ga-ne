import Phaser from 'phaser';

export type FaceName = 'normal' | 'blink' | 'panic' | 'tease' | 'happy' | 'dizzy' | 'angry' | 'cry' | 'squawk';
export const FACE_NAMES: FaceName[] = ['normal', 'blink', 'panic', 'tease', 'happy', 'dizzy', 'angry', 'cry', 'squawk'];
export const faceKey = (n: FaceName): string => `face_${n}`;

export const CHICKEN_TEXTURES = ['chicken_yellow', 'chicken_white', 'chicken_cream', 'chicken_orange'] as const;
const BODY_COLORS = [0xffe14d, 0xffffff, 0xffd98a, 0xffbf66];
const OUT = 0x5a3a1a;
const RED = 0xe53935;

// Kích thước/tâm của texture mặt (tâm mặt = tâm đầu gà)
export const FACE_W = 70, FACE_H = 64, FACE_CX = 32, FACE_CY = 32;

function drawBody(g: Phaser.GameObjects.Graphics, body: number): void {
  const shade = Phaser.Display.Color.ValueToColor(body).darken(14).color;
  g.lineStyle(4, 0xf5a623, 1);
  g.lineBetween(42, 80, 42, 95).lineBetween(60, 80, 60, 95);
  g.lineBetween(42, 95, 52, 95).lineBetween(60, 95, 70, 95);
  g.lineStyle(3, OUT, 1);
  g.fillStyle(shade);
  g.fillTriangle(24, 52, 6, 28, 32, 38).strokeTriangle(24, 52, 6, 28, 32, 38);
  g.fillTriangle(22, 62, 4, 48, 28, 50).strokeTriangle(22, 62, 4, 48, 28, 50);
  g.fillStyle(body).fillCircle(46, 58, 30).strokeCircle(46, 58, 30);
  g.lineStyle(2, OUT, 1).fillStyle(RED);
  for (const [x, y, r] of [[58, 16, 6], [66, 12, 7], [75, 17, 6]]) { g.fillCircle(x, y, r); g.strokeCircle(x, y, r); }
  g.lineStyle(3, OUT, 1).fillStyle(body).fillCircle(66, 36, 20).strokeCircle(66, 36, 20);
}

function drawWing(g: Phaser.GameObjects.Graphics, body: number): void {
  const shade = Phaser.Display.Color.ValueToColor(body).darken(14).color;
  g.lineStyle(3, OUT, 1).fillStyle(shade).fillEllipse(17, 13, 30, 22).strokeEllipse(17, 13, 30, 22);
}

function eyeNormal(g: Phaser.GameObjects.Graphics, r: number, px: number, py: number, pr: number): void {
  g.lineStyle(2.5, OUT, 1).fillStyle(0xffffff).fillCircle(38, 27, r).strokeCircle(38, 27, r);
  g.fillStyle(0x222222).fillCircle(px, py, pr);
  g.fillStyle(0xffffff).fillCircle(px + 1.6, py - 1.6, pr * 0.34);
}

function drawFace(g: Phaser.GameObjects.Graphics, f: FaceName): void {
  const openBeak = f === 'panic' || f === 'squawk';
  // mỏ
  g.lineStyle(3, OUT, 1);
  if (openBeak) {
    g.fillStyle(0xb71c1c).fillTriangle(48, 27, 62, 35, 48, 43);
    g.fillStyle(0xff9800);
    g.fillTriangle(48, 24, 66, 31, 48, 34).strokeTriangle(48, 24, 66, 31, 48, 34);
    g.fillTriangle(48, 36, 64, 43, 48, 47).strokeTriangle(48, 36, 64, 43, 48, 47);
  } else {
    if (f === 'tease') g.fillStyle(0xff6f91).fillEllipse(55, 47, 9, 14).strokeEllipse(55, 47, 9, 14);
    g.fillStyle(0xff9800).fillTriangle(48, 27, 64, 34, 48, 41).strokeTriangle(48, 27, 64, 34, 48, 41);
  }
  // yếm + má hồng
  g.lineStyle(2, OUT, 1).fillStyle(RED).fillCircle(46, 48, 5).strokeCircle(46, 48, 5);
  if (f !== 'angry') g.fillStyle(0xff8a80, 0.55).fillCircle(32, 40, 4);

  // mắt
  switch (f) {
    case 'normal': eyeNormal(g, 7.5, 40, 28, 3.8); break;
    case 'blink': g.lineStyle(3, OUT, 1).lineBetween(31, 28, 45, 28); break;
    case 'panic':
      eyeNormal(g, 9.5, 38, 27, 2.4);
      g.lineStyle(2, OUT, 1).fillStyle(0x4fc3f7).fillEllipse(20, 10, 7, 11).strokeEllipse(20, 10, 7, 11);
      g.fillEllipse(14, 20, 5, 8).strokeEllipse(14, 20, 5, 8);
      break;
    case 'tease':
    case 'happy':
      g.lineStyle(3.5, OUT, 1).beginPath();
      g.arc(38, 31, 7, Math.PI, 0, false);
      g.strokePath();
      break;
    case 'dizzy':
      g.lineStyle(2.5, OUT, 1).fillStyle(0xffffff).fillCircle(38, 27, 9).strokeCircle(38, 27, 9);
      g.strokeCircle(38, 27, 5.5).strokeCircle(38, 27, 2.2);
      break;
    case 'angry':
      eyeNormal(g, 6.5, 40, 29, 3.2);
      g.lineStyle(5, OUT, 1).lineBetween(27, 15, 47, 23);
      break;
    case 'cry':
      eyeNormal(g, 8, 38, 29, 4.6);
      g.lineStyle(3, OUT, 1).lineBetween(29, 20, 45, 14);
      g.fillStyle(0x4fc3f7).fillEllipse(34, 42, 5, 10).fillEllipse(43, 40, 4, 9);
      break;
    case 'squawk':
      g.lineStyle(4, OUT, 1).lineBetween(31, 21, 44, 27).lineBetween(44, 27, 31, 33);
      break;
  }
}

export function ensureChickenTextures(scene: Phaser.Scene): void {
  CHICKEN_TEXTURES.forEach((key, i) => {
    if (!scene.textures.exists(key)) {
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      drawBody(g, BODY_COLORS[i]);
      g.generateTexture(key, 100, 100);
      g.destroy();
    }
    const wk = `${key}_wing`;
    if (!scene.textures.exists(wk)) {
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      drawWing(g, BODY_COLORS[i]);
      g.generateTexture(wk, 34, 26);
      g.destroy();
    }
  });
  for (const f of FACE_NAMES) {
    const k = faceKey(f);
    if (scene.textures.exists(k)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawFace(g, f);
    g.generateTexture(k, FACE_W, FACE_H);
    g.destroy();
  }
}
