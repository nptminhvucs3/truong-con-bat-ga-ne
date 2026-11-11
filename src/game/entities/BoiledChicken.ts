import Phaser from 'phaser';

/** Đĩa gà luộc nguyên con (vẽ bằng Graphics), gốc tọa độ ở giữa đĩa. */
export function createBoiledChicken(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const OUT = 0x8d5a1b;
  g.fillStyle(0xffffff).fillEllipse(0, 20, 230, 64);
  g.lineStyle(4, 0x1e88e5, 1).strokeEllipse(0, 20, 230, 64);
  g.fillStyle(0xf3f7fb).fillEllipse(0, 18, 190, 46);
  g.lineStyle(3, OUT, 1);
  g.fillStyle(0xf2c36f).fillEllipse(-48, -2, 24, 40).strokeEllipse(-48, -2, 24, 40);
  g.fillStyle(0xf2c36f).fillEllipse(48, -2, 24, 40).strokeEllipse(48, -2, 24, 40);
  g.fillStyle(0xf6cf86).fillEllipse(0, 8, 120, 62).strokeEllipse(0, 8, 120, 62);
  g.fillStyle(0xfbe3b0, 0.75).fillEllipse(-8, 2, 70, 30);
  g.fillStyle(0xf6cf86).fillCircle(68, -6, 18).strokeCircle(68, -6, 18);
  g.lineStyle(3, 0x5a3a1a, 1).lineBetween(62, -9, 71, -9);
  g.lineStyle(3, OUT, 1);
  g.fillStyle(0xff9800).fillTriangle(84, -6, 98, 0, 84, 4).strokeTriangle(84, -6, 98, 0, 84, 4);
  g.fillStyle(0xe53935).fillCircle(68, -25, 6).strokeCircle(68, -25, 6);
  g.fillStyle(0xaed581).fillCircle(-84, 22, 10).strokeCircle(-84, 22, 10);
  g.fillStyle(0xdcedc8).fillCircle(-84, 22, 3);
  return scene.add.container(0, 0, [g]);
}
