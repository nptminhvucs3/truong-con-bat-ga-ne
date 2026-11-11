import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { seeded } from '../utils/random';

/** Vẽ sân cỏ hoạt hình một lần rồi "nướng" thành texture để render nhẹ. */
export function buildFieldTexture(scene: Phaser.Scene, key = 'field'): void {
  if (scene.textures.exists(key)) return;
  const { width: W, height: H } = GAME_CONFIG.world;
  const r = seeded(7);
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const OUT = 0x5a3a1a;

  // Bầu trời + mây + đồi xa
  g.fillStyle(0xa8e0f5).fillRect(0, 0, W, 130);
  g.fillStyle(0xffffff, 0.9);
  for (const [cx, cy, w] of [[160, 28, 150], [520, 18, 190], [900, 34, 160], [1170, 16, 140]]) {
    g.fillEllipse(cx, cy, w, 36).fillEllipse(cx + w * 0.25, cy - 12, w * 0.6, 30);
  }
  g.fillStyle(0x8fd17a);
  for (let x = -40; x < W + 80; x += 130) g.fillCircle(x + r() * 40, 100, 52 + r() * 22);
  g.fillStyle(0x6cba5c);
  for (let x = 20; x < W + 80; x += 170) g.fillCircle(x + r() * 40, 112, 40 + r() * 16);

  // Cỏ nền + sọc cắt cỏ
  g.fillStyle(0x6abf4b).fillRect(0, 108, W, H - 108);
  g.fillStyle(0x5fb243, 0.55);
  for (let x = 0; x < W; x += 160) g.fillRect(x, 108, 80, H - 108);
  // vệt sáng/tối loang
  for (let i = 0; i < 14; i++) {
    g.fillStyle(r() > 0.5 ? 0x7ed05a : 0x58a83e, 0.22);
    g.fillEllipse(r() * W, 150 + r() * (H - 150), 160 + r() * 200, 50 + r() * 70);
  }

  // Khu đất quanh nồi + sỏi
  const potX = W - 150, potY = 640;
  g.fillStyle(0xcfae6e).fillEllipse(potX, potY - 10, 330, 140);
  g.fillStyle(0xdcc388).fillEllipse(potX, potY - 14, 270, 108);
  g.lineStyle(2, 0xb08d4f, 0.8).strokeEllipse(potX, potY - 10, 330, 140);
  g.fillStyle(0xb39362);
  for (let i = 0; i < 16; i++) g.fillCircle(potX + (r() - 0.5) * 290, potY - 10 + (r() - 0.5) * 110, 2 + r() * 2);

  // Lối đi đất nhỏ bên trái (nơi Trường Con đứng)
  g.fillStyle(0xd9be82, 0.85).fillEllipse(140, 650, 260, 90);

  // Cỏ tua + hoa + đá
  g.lineStyle(2, 0x4a9a37, 0.9);
  for (let i = 0; i < 300; i++) {
    const x = r() * W, y = 125 + r() * (H - 135);
    g.lineBetween(x, y, x - 3, y - 7).lineBetween(x, y, x, y - 9).lineBetween(x, y, x + 3, y - 7);
  }
  const petals = [0xffffff, 0xffeb3b, 0xff8a80, 0xce93d8];
  for (let i = 0; i < 44; i++) {
    const x = 30 + r() * (W - 60), y = 150 + r() * (H - 190);
    g.fillStyle(petals[Math.floor(r() * petals.length)]);
    for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) g.fillCircle(x + dx, y + dy, 2.6);
    g.fillStyle(0xffc107).fillCircle(x, y, 2);
  }
  for (let i = 0; i < 8; i++) {
    const x = 60 + r() * (W - 120), y = 230 + r() * (H - 280), w = 18 + r() * 16;
    g.fillStyle(0x000000, 0.12).fillEllipse(x + 2, y + 5, w + 4, w * 0.45);
    g.fillStyle(0xa0a8ad).fillEllipse(x, y, w, w * 0.62);
    g.lineStyle(2, 0x6c757a, 1).strokeEllipse(x, y, w, w * 0.62);
    g.fillStyle(0xd4dade, 0.8).fillEllipse(x - w * 0.15, y - w * 0.12, w * 0.4, w * 0.2);
  }

  // Cây hai bên
  for (const tx of [70, W - 70]) {
    g.fillStyle(0x7b5a43).fillRect(tx - 11, 70, 22, 62);
    g.lineStyle(3, OUT, 1).strokeRect(tx - 11, 70, 22, 62);
    for (const [dx, dy, rad, c] of [[0, 30, 52, 0x2f8f3a], [-30, 52, 38, 0x3aa046], [30, 52, 38, 0x3aa046], [-8, 20, 30, 0x57bb5f]] as const) {
      g.fillStyle(c).fillCircle(tx + dx, dy, rad);
    }
  }

  // Bụi cây sau hàng rào
  for (let x = 10; x < W + 40; x += 64) {
    g.fillStyle(0x2e7d32).fillCircle(x, 126, 28);
    g.fillStyle(0x43a047).fillCircle(x - 6, 120, 22);
    g.fillStyle(0x7ccf7f).fillCircle(x - 10, 113, 8);
  }

  // Hàng rào trên
  g.fillStyle(0xdcab6b).lineStyle(3, OUT, 1);
  for (const ry of [118, 142]) { g.fillRect(0, ry, W, 10); g.strokeRect(0, ry, W, 10); }
  for (let x = 14; x < W; x += 62) {
    g.fillRect(x - 8, 104, 16, 62); g.strokeRect(x - 8, 104, 16, 62);
    g.fillTriangle(x - 8, 104, x + 8, 104, x, 92); g.strokeTriangle(x - 8, 104, x + 8, 104, x, 92);
  }

  // Hàng rào thấp dưới
  for (let x = 14; x < W; x += 62) {
    g.fillRect(x - 6, H - 40, 12, 40); g.strokeRect(x - 6, H - 40, 12, 40);
  }
  g.fillRect(0, H - 28, W, 8); g.strokeRect(0, H - 28, W, 8);

  // Bụi hai bên rìa
  for (const sx of [-4, W + 4]) {
    for (let y = 230; y < H - 70; y += 110) {
      g.fillStyle(0x2e7d32).fillCircle(sx, y, 38);
      g.fillStyle(0x43a047).fillCircle(sx + (sx < 0 ? 8 : -8), y - 6, 26);
    }
  }

  g.generateTexture(key, W, H);
  g.destroy();
}
