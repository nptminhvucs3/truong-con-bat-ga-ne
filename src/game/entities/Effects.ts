import Phaser from 'phaser';

const FONT = 'system-ui, "Segoe UI", sans-serif';
const TC_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: FONT, fontSize: '28px', fontStyle: '900', color: '#ffffff',
  stroke: '#5a3a1a', strokeThickness: 6, backgroundColor: 'rgba(0,0,0,0)', padding: { x: 0, y: 0 },
};
const CHICK_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#3b2a14',
  stroke: '#000000', strokeThickness: 0, backgroundColor: 'rgba(255,255,255,0.93)', padding: { x: 8, y: 3 },
};

/** Hiệu ứng dùng object pooling: bụi, lông gà, hơi nước, bong bóng chữ. */
export class Effects {
  private pool: Phaser.GameObjects.Ellipse[] = [];
  private says: Phaser.GameObjects.Text[] = [];

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < 64; i++) this.pool.push(scene.add.ellipse(0, 0, 10, 10, 0xffffff).setVisible(false));
    for (let i = 0; i < 8; i++) this.says.push(scene.add.text(0, 0, '', TC_STYLE).setOrigin(0.5, 1).setVisible(false).setDepth(7000));
  }

  private spawn(x: number, y: number, w: number, h: number, color: number, alpha: number,
                dx: number, dy: number, dur: number, endScale: number, rot: number, depth: number): void {
    const e = this.pool.find((p) => !p.visible);
    if (!e) return;
    const sx = w / 10, sy = h / 10;
    e.setVisible(true).setPosition(x, y).setScale(sx, sy).setAlpha(alpha).setAngle(0).setDepth(depth);
    e.setFillStyle(color, 1);
    this.scene.tweens.add({
      targets: e, x: x + dx, y: y + dy, alpha: 0, scaleX: sx * endScale, scaleY: sy * endScale, angle: rot,
      duration: dur, ease: 'Sine.easeOut', onComplete: () => { e.setVisible(false); },
    });
  }

  dust(x: number, y: number): void {
    this.spawn(x, y, 24, 11, 0xe8d9a8, 0.7, Phaser.Math.Between(-12, 12), -10, 420, 1.9, 0, y + 1);
  }
  feather(x: number, y: number): void {
    this.spawn(x, y, 12, 5, 0xffffff, 1, Phaser.Math.Between(-70, 70), Phaser.Math.Between(-130, -60), 800, 0.8, Phaser.Math.Between(-200, 200), 5500);
  }
  steam(x: number, y: number): void {
    this.spawn(x, y, 34, 26, 0xffffff, 0.75, Phaser.Math.Between(-24, 24), -100, 950, 1.9, 0, 5600);
  }

  /** Bong bóng chữ nổi lên rồi mờ dần. kind 'tc' = lời Trường Con, 'chick' = lời gà. */
  say(text: string, x: number, y: number, kind: 'tc' | 'chick' = 'tc'): void {
    const t = this.says.find((s) => !s.visible);
    if (!t) return;
    t.setStyle(kind === 'tc' ? TC_STYLE : CHICK_STYLE);
    t.setText(text);
    const half = t.width / 2 + 8;
    t.setPosition(Phaser.Math.Clamp(x, half, 1280 - half), y).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: t, y: y - 34, alpha: 0, delay: kind === 'tc' ? 800 : 650, duration: 500,
      onComplete: () => { t.setVisible(false); },
    });
  }
  emote(text: string, x: number, y: number): void { this.say(text, x, y, 'tc'); }
}
