import Phaser from 'phaser';

const OUT = 0x37474f;
const LID_X = 0, LID_Y = -108;

/** Nồi lớn: thân nồi + nắp nồi tách riêng; có animation rung, bật nắp, mở/đóng nắp. */
export class CookingPot extends Phaser.GameObjects.Container {
  readonly lid: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const shadow = scene.add.ellipse(0, 4, 210, 40, 0x000000, 0.28);

    const body = scene.add.graphics();
    body.lineStyle(4, OUT, 1);
    body.fillStyle(0x546e7a);
    body.fillEllipse(-96, -52, 30, 22).strokeEllipse(-96, -52, 30, 22);
    body.fillEllipse(96, -52, 30, 22).strokeEllipse(96, -52, 30, 22);
    body.fillStyle(0x78909c).fillRoundedRect(-82, -104, 164, 104, 24).strokeRoundedRect(-82, -104, 164, 104, 24);
    body.fillStyle(0xcfd8dc, 0.55).fillRoundedRect(-68, -92, 16, 66, 8);
    body.fillStyle(0x455a64, 0.35).fillRoundedRect(46, -92, 22, 82, 10);
    body.fillStyle(0x546e7a).fillEllipse(0, -104, 176, 34).strokeEllipse(0, -104, 176, 34);
    body.fillStyle(0x263238).fillEllipse(0, -104, 150, 22);

    this.lid = scene.add.graphics();
    this.lid.setPosition(LID_X, LID_Y);
    this.lid.lineStyle(4, OUT, 1);
    this.lid.fillStyle(0x90a4ae).fillEllipse(0, 0, 184, 36).strokeEllipse(0, 0, 184, 36);
    this.lid.fillStyle(0xb0bec5).fillEllipse(0, -10, 130, 34).strokeEllipse(0, -10, 130, 34);
    this.lid.fillStyle(0xeceff1, 0.7).fillEllipse(-24, -14, 36, 10);
    this.lid.fillStyle(0xe53935).fillCircle(0, -32, 10).strokeCircle(0, -32, 10);

    this.add([shadow, body, this.lid]);
    scene.add.existing(this);
    this.setDepth(y);
  }

  private stop(): void { this.scene.tweens.killTweensOf([this, this.lid]); }

  reset(): void {
    this.stop();
    this.setAngle(0);
    this.lid.setPosition(LID_X, LID_Y).setAngle(0);
  }

  /** Rung nồi + nắp nhảy lên xuống. */
  shake(on: boolean): void {
    this.reset();
    if (!on) return;
    this.scene.tweens.add({ targets: this, angle: { from: -3.5, to: 3.5 }, duration: 70, yoyo: true, repeat: -1 });
    this.scene.tweens.add({ targets: this.lid, y: { from: LID_Y, to: LID_Y - 14 }, angle: { from: -4, to: 4 }, duration: 95, yoyo: true, repeat: -1 });
  }

  openLid(): void {
    this.stop();
    this.scene.tweens.add({ targets: this.lid, x: 125, y: -26, angle: 35, duration: 350, ease: 'Back.easeOut' });
  }

  closeLid(): void {
    this.stop();
    this.setAngle(0);
    this.scene.tweens.add({ targets: this.lid, x: LID_X, y: LID_Y, angle: 0, duration: 300, ease: 'Quad.easeIn' });
  }

  /** Nắp bật tung ra rồi rơi xuống bên cạnh nồi. */
  popLid(): void {
    this.stop();
    this.setAngle(0);
    this.scene.tweens.add({
      targets: this.lid, x: 60, y: -250, angle: 50, duration: 260, ease: 'Quad.easeOut',
      onComplete: () => {
        this.scene.tweens.add({ targets: this.lid, x: 125, y: -26, angle: 35, duration: 380, ease: 'Bounce.easeOut' });
      },
    });
  }
}
