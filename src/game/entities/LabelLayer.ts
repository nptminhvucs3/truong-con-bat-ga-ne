import Phaser from 'phaser';
import { CHICKEN_LABEL_Y, type Chicken } from './Chicken';

const MAX_W = 140;

/**
 * Nhãn tên nằm ở một lớp riêng phía trên mọi con gà (không bị gà khác che),
 * luôn đặt ngay trên đầu con gà tương ứng. Việc tránh chồng nhãn do scene giãn gà ra xa nhau.
 */
export class LabelLayer {
  private labels = new Map<string, Phaser.GameObjects.Text>();

  constructor(private scene: Phaser.Scene) {}

  /** Tạo/xóa nhãn cho khớp danh sách gà, cập nhật chữ, cỡ chữ và kích thước nhãn. */
  sync(list: Chicken[], textFor: (c: Chicken) => string, fontSize: number): void {
    const ids = new Set(list.map((c) => c.studentId));
    for (const [id, t] of this.labels) {
      if (!ids.has(id)) { t.destroy(); this.labels.delete(id); }
    }
    for (const c of list) {
      let t = this.labels.get(c.studentId);
      if (!t) {
        t = this.scene.add.text(c.x, c.y - CHICKEN_LABEL_Y, '', {
          fontFamily: 'system-ui, "Segoe UI", sans-serif', fontStyle: 'bold', color: '#ffffff',
          backgroundColor: 'rgba(20,40,20,0.86)', padding: { x: 7, y: 3 },
        }).setOrigin(0.5, 1).setDepth(3000);
        this.labels.set(c.studentId, t);
      }
      t.setFontSize(fontSize);
      t.setText(textFor(c));
      t.setScale(t.width > MAX_W ? MAX_W / t.width : 1);
      c.labelW = t.displayWidth;
      c.labelH = t.displayHeight;
    }
  }

  /** Gọi mỗi frame sau khi các con gà đã di chuyển. */
  layout(list: Chicken[]): void {
    for (const c of list) {
      const t = this.labels.get(c.studentId);
      if (!t) continue;
      const show = c.visible && c.alpha > 0.05 && c.chickenState !== 'IN_POT' && c.chickenState !== 'COOKED';
      t.setVisible(show);
      if (show) t.setPosition(c.x, c.y - CHICKEN_LABEL_Y).setDepth(3000 + c.y); // gà phía trước có nhãn nằm trên
    }
  }
}
