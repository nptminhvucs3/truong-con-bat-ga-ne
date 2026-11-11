import Phaser from 'phaser';
import { ASSETS } from '../config/gameConfig';
import { TC_CANVAS, TC_FRAMES } from '../config/frames';
import { TC_CUSTOM_ANIMS, type TcAnimDef } from '../config/tcAnimConfig';

/** Nạp tài nguyên. Thiếu ảnh thì tạo placeholder để game không bị lỗi. */
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    for (const n of TC_FRAMES) this.load.image(`tc_${n}`, ASSETS.truongConFrame(n));
    this.load.image('plateChicken', ASSETS.plateChicken);
    // Animation chạy/đi do bạn cung cấp (nếu có khai báo trong tcAnimConfig.ts)
    const base = import.meta.env.BASE_URL;
    for (const def of Object.values(TC_CUSTOM_ANIMS) as TcAnimDef[]) {
      if (def.json) this.load.atlas(def.key, base + def.png, base + def.json);
      else this.load.spritesheet(def.key, base + def.png, { frameWidth: def.frameWidth ?? 128, frameHeight: def.frameHeight ?? 128 });
    }
  }

  create() {
    for (const n of TC_FRAMES) {
      const key = `tc_${n}`;
      if (this.textures.exists(key)) continue;
      const [w, h] = TC_CANVAS;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff).fillRoundedRect(w / 2 - 50, 20, 100, h - 40, 18);
      g.lineStyle(4, 0x333333).strokeRoundedRect(w / 2 - 50, 20, 100, h - 40, 18);
      g.generateTexture(key, w, h);
      g.destroy();
    }
    for (const [name, def] of Object.entries(TC_CUSTOM_ANIMS) as Array<[string, TcAnimDef]>) {
      if (!this.textures.exists(def.key)) { console.warn(`[Trường Con] không nạp được animation "${name}" (${def.png})`); continue; }
      const byName = def.json ? this.textures.get(def.key).getFrameNames().map((f: string) => ({ key: def.key, frame: f })) : [];
      const frames = byName.length > 0 ? byName : this.anims.generateFrameNumbers(def.key, {});
      if (frames.length === 0) continue;
      this.anims.create({ key: `tc-${name}`, frames, frameRate: def.fps, repeat: -1 });
    }
    this.scene.start('MainGameScene');
  }
}
