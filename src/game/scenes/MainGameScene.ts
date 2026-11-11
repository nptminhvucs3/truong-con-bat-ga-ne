import Phaser from 'phaser';
import type { RoundStats, Settings, Student } from '../../types';
import { GAME_CONFIG } from '../config/gameConfig';
import { EVT, gameBus } from '../events';
import { createBoiledChicken } from '../entities/BoiledChicken';
import { LabelLayer } from '../entities/LabelLayer';
import { Chicken, isBlocked, type PlayArea } from '../entities/Chicken';
import { CHICKEN_TEXTURES, ensureChickenTextures } from '../entities/ChickenTextures';
import { CookingPot } from '../entities/CookingPot';
import { Effects } from '../entities/Effects';
import { buildFieldTexture } from '../entities/Field';
import { TruongCon } from '../entities/TruongCon';
import { audio } from '../managers/AudioManager';
import { GameStateManager } from '../managers/GameStateManager';
import { defaultSettings } from '../managers/SettingsStore';
import { shortName } from '../managers/StudentManager';
import { pick, rand } from '../utils/random';

const W = GAME_CONFIG.world.width;
const H = GAME_CONFIG.world.height;
const POT_X = W - 150;
const POT_Y = 650;
const POT_MOUTH_Y = POT_Y - 120;
const POT_STAND = { x: POT_X - 150, y: POT_Y - 8 };
const ENTRY = { x: 240, y: 600 };

const TC_LINES = {
  enter: ['Trường Con tới đây!', 'Hôm nay ai xui nè?', 'Để anh bắt gà!'],
  chase: ['Đứng lại!', 'Chạy đâu cho thoát!', 'Gà ơi là gà!', 'Lùa hết cả đàn!', 'Tới đây nào!'],
  catch: ['Bắt được rồi!', 'Dính nè cưng!', 'Hú hú!'],
  miss: ['Á! Trượt rồi!', 'Trời đất ơi!', 'Hự!', 'Ối giời ơi!'],
  pot: ['Vào nồi nào!', 'Nằm yên đó!', 'Ngoan nào!'],
  surprise: ['Ơ kìa?!', 'Cái gì vậy?!', 'Hả?!'],
  rage: ['Sổng mất rồi!', 'Tức quá đi!', 'Mày dám sao?!', 'Gà này láo thật!'],
  cooked: ['Các em cứ thử luộc đúng 1 con gà.....', 'Để nguyên không chặt...', '66B Nguyễn Sỹ Sách'],
  over: ['Hôm nay gà thắng...', 'Sao khổ thế này...'],
};
const CHICK_SCARED = ['Cục tác!', 'Cứu!!', 'Á á á!', 'Hú hồn!', 'Mẹ ơi!', 'Chạy đi!!'];
const CHICK_GASP = ['Ôi không!', 'Tội bạn quá...', 'Cứu bạn tôi!'];
const CHICK_TEASE = ['Lêu lêu!', 'Hẹ hẹ hẹ', 'Hụt rồi nha!'];

export class MainGameScene extends Phaser.Scene {
  private chickens = new Map<string, Chicken>();
  private list: Chicken[] = [];
  private scaredBuf: Chicken[] = [];
  private area!: PlayArea;
  private fsm = new GameStateManager();
  private tc!: TruongCon;
  private pot!: CookingPot;
  private fx!: Effects;
  private labels!: LabelLayer;
  private plate!: Phaser.GameObjects.Container;
  private winnerText!: Phaser.GameObjects.Text;

  private target: Chicken | null = null;   // con đang bị chộp
  private held: Chicken | null = null;     // con đang cầm / trong nồi
  private holding = false;
  private goal = { x: W / 2, y: 450 };     // điểm Trường Con đang chạy tới để lùa đàn
  private goalTimer = 0;
  private attemptsUsed = 0;
  private misses = 0;
  private chaseTime = 0;
  private recovery = 0;
  private catchPhase: 'reach' | 'missed' = 'reach';
  private willMiss = false;
  private willEscape = false;
  private shakeMs = 0;
  private featherTimer = 0;
  private peekTimer = 0;
  private dustTimer = 0;
  private steamTimer = 0;
  private cluckCd = 0;
  private chatCd = 0;
  private tcChatCd = 0;
  private arrivedAt = -1;
  private step = 0;
  private debugText: Phaser.GameObjects.Text | null = null;

  constructor() { super('MainGameScene'); }

  private get cfg(): Settings {
    return (this.registry.get('settings') as Settings | undefined) ?? defaultSettings;
  }

  create() {
    buildFieldTexture(this);
    ensureChickenTextures(this);
    this.add.image(0, 0, 'field').setOrigin(0, 0).setDepth(-1);

    this.pot = new CookingPot(this, POT_X, POT_Y);
    this.tc = new TruongCon(this, -90, ENTRY.y);
    this.fx = new Effects(this);
    if (this.textures.exists('plateChicken')) {
      const img = this.add.image(0, 0, 'plateChicken');
      img.setScale(280 / img.width);
      this.plate = this.add.container(0, 0, [img]);
    } else {
      this.plate = createBoiledChicken(this); // dự phòng khi thiếu ảnh
    }
    this.plate.setVisible(false).setDepth(6000);
    this.labels = new LabelLayer(this);
    this.winnerText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui, "Segoe UI", sans-serif', fontSize: '44px', fontStyle: '900',
      color: '#ffffff', stroke: '#5a3a1a', strokeThickness: 8, align: 'center',
    }).setOrigin(0.5).setVisible(false).setDepth(6001);

    this.area = {
      bounds: { minX: 80, maxX: W - 80, minY: 200, maxY: H - 45 },
      avoid: [{ x: POT_X, y: POT_Y - 40, r: 150 }],
      solids: [{ x: POT_X, y: POT_Y - 25, rx: 125, ry: 60 }], // bếp: gà không đi vào được
    };

    this.syncStudents((this.registry.get('students') as Student[] | undefined) ?? []);

    gameBus.on(EVT.sync, this.syncStudents, this);
    gameBus.on(EVT.settings, this.refreshLabels, this);
    gameBus.on(EVT.pause, this.doPause, this);
    gameBus.on(EVT.resume, this.doResume, this);
    gameBus.on(EVT.startRound, this.beginRound, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    // Thêm ?debug vào địa chỉ để xem trạng thái game (phục vụ kiểm thử)
    if (new URLSearchParams(window.location.search).has('debug')) {
      this.debugText = this.add.text(8, 8, '', {
        fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.65)', padding: { x: 6, y: 3 },
      }).setDepth(9000);
    }

    this.beginRound();
  }

  private cleanup(): void {
    gameBus.off(EVT.sync, this.syncStudents, this);
    gameBus.off(EVT.settings, this.refreshLabels, this);
    gameBus.off(EVT.pause, this.doPause, this);
    gameBus.off(EVT.resume, this.doResume, this);
    gameBus.off(EVT.startRound, this.beginRound, this);
    this.chickens.clear();
    this.list = [];
  }

  private doPause(): void { if (this.scene.isActive()) this.scene.pause(); }
  private doResume(): void { if (this.scene.isPaused()) this.scene.resume(); }

  // ---------- Danh sách gà ----------
  private syncStudents(students: Student[]): void {
    const keep = new Set(students.map((s) => s.id));
    for (const [id, c] of this.chickens) {
      if (!keep.has(id)) {
        this.chickens.delete(id);
        if (c === this.target) this.target = null;
        if (c === this.held) { this.held = null; this.holding = false; }
        this.tweens.killTweensOf([c, c.sprite]);
        this.tweens.add({ targets: c, alpha: 0, scale: 0.2, duration: 300, onComplete: () => c.destroy() });
      }
    }
    for (const s of students) if (!this.chickens.has(s.id)) this.spawn(s);
    this.list = [...this.chickens.values()];
    this.refreshLabels();
  }

  /** Cỡ chữ và kiểu tên tự điều chỉnh theo số học sinh để đỡ chồng chéo. */
  private refreshLabels(): void {
    if (!this.labels) return;
    const n = this.list.length;
    const mode = this.cfg.nameMode;
    const short = mode === 'short' || (mode === 'auto' && n > 20);
    const size = n <= 12 ? 18 : n <= 20 ? 16 : n <= 30 ? 14 : 12;
    this.labels.sync(this.list, (c) => (short ? shortName(c.studentName) : c.studentName), size);
  }

  private spawn(student: Student): void {
    const b = this.area.bounds;
    let bx = (b.minX + b.maxX) / 2, by = (b.minY + b.maxY) / 2, bestD = -1;
    for (let i = 0; i < 60; i++) {
      const x = rand(b.minX, b.maxX), y = rand(b.minY, b.maxY);
      if (isBlocked(this.area, x, y)) continue;
      let d = Infinity;
      for (const c of this.chickens.values()) d = Math.min(d, Math.hypot(c.x - x, c.y - y));
      if (d > bestD) { bestD = d; bx = x; by = y; }
    }
    const c = new Chicken(this, bx, by, student, pick(CHICKEN_TEXTURES), this.area);
    c.onSay = (text, x, y) => this.fx.say(text, x, y, 'chick');
    this.chickens.set(student.id, c);
  }

  // ---------- Tiện ích ----------
  private tcSay(lines: string[]): void { this.fx.emote(pick(lines), this.tc.x, this.tc.y - 262 * this.tc.scaleX); }
  private chickSay(c: Chicken, lines: string[]): void { this.fx.say(pick(lines), c.x, c.y - 118, 'chick'); }
  private sayOthers(lines: string[], n: number): void {
    const others = this.list.filter((c) => c !== this.target && c !== this.held && c.isRoaming);
    for (let i = 0; i < n && others.length > 0; i++) {
      const k = Math.floor(Math.random() * others.length);
      const c = others.splice(k, 1)[0];
      c.setFace('panic');
      this.chickSay(c, lines);
    }
  }
  private zoomPunch(): void {
    this.cameras.main.zoomTo(1.05, 110, 'Quad.easeOut', true, (cam: Phaser.Cameras.Scene2D.Camera, p: number) => {
      if (p === 1) cam.zoomTo(1, 240);
    });
  }
  private emitStats(): void {
    const st: RoundStats = { attempts: this.attemptsUsed, maxAttempts: this.cfg.maxPotAttempts, misses: this.misses };
    gameBus.emit(EVT.stats, st);
  }
  private isCatchable(c: Chicken): boolean {
    return !c.escaped && c.immuneMs <= 0 && (c.chickenState === 'IDLE' || c.chickenState === 'WALK' || c.chickenState === 'FLEE');
  }

  // ---------- Vòng chơi ----------
  /** Reset toàn bộ thế giới rồi bắt đầu vòng mới (an toàn khi gọi ở bất kỳ trạng thái nào). */
  private beginRound(): void {
    this.pot.reset();
    this.plate.setVisible(false);
    this.winnerText.setVisible(false);
    this.tweens.killTweensOf([this.plate, this.winnerText]);
    this.cameras.main.resetFX();
    this.cameras.main.setZoom(1);
    this.tc.setPosition(-90, ENTRY.y);
    this.tc.setAnim('idle');
    this.list = [...this.chickens.values()];
    for (const c of this.list) c.resetState();
    this.target = null; this.held = null; this.holding = false;
    this.attemptsUsed = 0; this.misses = 0; this.recovery = 0;
    this.emitStats();
    this.fsm.set('PREPARING');
  }

  private enter(s: Parameters<GameStateManager['set']>[0]): void {
    this.fsm.set(s);
    switch (s) {
      case 'CHARACTER_ENTERING':
        this.tc.setPosition(-90, ENTRY.y);
        this.tc.setAnim('walk', 'smug');
        this.arrivedAt = -1;
        audio.play('appear');
        break;

      case 'CHASING':
        this.tc.setAnim('run', this.attemptsUsed > 0 ? 'rage' : 'smug');
        this.pickGoal();
        this.tcChatCd = 600;
        break;

      case 'CATCHING':
        this.catchPhase = 'reach';
        this.willMiss = Math.random() < this.cfg.catchMissChance;
        this.tc.setAnim('catch');
        this.target?.freeze();
        this.target?.setFace('squawk');
        audio.play('boing');
        break;

      case 'CARRYING':
        this.held = this.target;
        this.target = null;
        this.holding = true;
        this.held?.capture();
        this.tc.setAnim('carry');
        this.tcSay(TC_LINES.catch);
        this.sayOthers(CHICK_GASP, 2);
        this.zoomPunch();
        audio.play('catch');
        break;

      case 'PUTTING_IN_POT':
        this.holding = false;
        this.step = 0;
        this.tc.setAnim('putInPot');
        this.tcSay(TC_LINES.pot);
        audio.play('putInPot');
        this.pot.openLid();
        this.held?.dropInto(POT_X, POT_MOUTH_Y);
        break;

      case 'POT_SHAKING':
        this.willEscape = Math.random() < this.cfg.escapeChance;
        this.shakeMs = rand(GAME_CONFIG.potShakeMs.min, GAME_CONFIG.potShakeMs.max);
        this.featherTimer = 0;
        this.peekTimer = 300;
        this.pot.shake(true);
        this.tc.setAnim('holdPot');
        break;

      case 'CHICKEN_ESCAPING': {
        this.pot.shake(false);
        this.pot.popLid();
        audio.play('lidPop');
        audio.play('escape');
        this.cameras.main.shake(260, 0.008);
        for (let i = 0; i < 12; i++) this.fx.feather(POT_X + rand(-40, 40), POT_MOUTH_Y);
        const ch = this.held;
        this.held = null;
        if (ch) { const p = this.escapePoint(); ch.popOut(POT_X, POT_MOUTH_Y, p.x, p.y); audio.play('flap'); }
        this.attemptsUsed++;
        this.emitStats();
        this.step = 0;
        this.tc.setAnim('surprise');
        this.tcSay(TC_LINES.surprise);
        break;
      }

      case 'CHICKEN_COOKED':
        this.pot.shake(false);
        if (this.held) { this.tweens.killTweensOf(this.held); this.held.setVisible(false); }
        this.tc.setAnim('victory');
        this.tcSay(TC_LINES.cooked);
        this.step = 0;
        this.steamTimer = 0;
        break;

      case 'GAME_OVER':
        this.tc.setAnim('frustrated', 'sad');
        this.tcSay(TC_LINES.over);
        audio.play('sad');
        break;

      default:
        break;
    }
  }

  private escapePoint(): { x: number; y: number } {
    const b = this.area.bounds;
    for (let i = 0; i < 20; i++) {
      const x = rand(b.minX, b.maxX), y = rand(b.minY, b.maxY);
      if (!isBlocked(this.area, x, y) && Math.hypot(x - POT_X, y - POT_Y) > 300) return { x, y };
    }
    return { x: b.minX + 40, y: (b.minY + b.maxY) / 2 };
  }

  /** Bắt đầu một lượt lùa gà mới (hoặc kết thúc vòng nếu hết lượt/hết gà). */
  private startAttempt(): void {
    if (this.chickens.size === 0) { this.fsm.set('GAME_OVER'); return; } // hết danh sách: chờ React xử lý
    const cands = this.list.filter((c) => !c.escaped && (c.chickenState === 'IDLE' || c.chickenState === 'WALK' || c.chickenState === 'FLEE'));
    if (this.attemptsUsed >= this.cfg.maxPotAttempts || cands.length === 0) {
      this.enter('GAME_OVER');
      gameBus.emit(EVT.noCatch, this.attemptsUsed);
      return;
    }
    this.chaseTime = 0; this.recovery = 0; this.target = null;
    this.enter('CHASING');
  }

  /**
   * Chọn điểm đến ngẫu nhiên cho Trường Con khi lùa đàn: thường là chạy về phía một con gà ngẫu nhiên
   * (trừ con vừa bắt hụt), đôi khi chạy ngang qua sân; đuổi lâu thì nhắm con gần nhất để vòng chơi kết thúc.
   */
  private pickGoal(): void {
    const b = this.area.bounds;
    const cands = this.list.filter((c) => this.isCatchable(c));
    if (cands.length > 0 && (this.chaseTime > 9000 || Math.random() < 0.7)) {
      let c = pick(cands);
      if (this.chaseTime > 9000) {
        let bd = Infinity;
        for (const k of cands) { const d = Math.hypot(k.x - this.tc.x, k.y - this.tc.y); if (d < bd) { bd = d; c = k; } }
      }
      this.goal = { x: c.x + rand(-50, 50), y: c.y + rand(-30, 30) };
    } else {
      this.goal = { x: rand(b.minX, b.maxX), y: rand(b.minY, b.maxY) };
    }
    this.goalTimer = rand(1200, 2600);
  }

  // ---------- Vòng lặp ----------
  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50); // tránh nhảy cóc khi tab bị treo
    this.fsm.tick(dt);
    this.tc.tick(dt);
    this.updateChickens(dt);
    this.updateFlow(dt);
    this.labels.layout(this.list);
    if (this.debugText) {
      this.debugText.setText(
        `${this.fsm.state} ${(this.fsm.time / 1000).toFixed(1)}s | gà ${this.list.length} | lượt ${this.attemptsUsed}/${this.cfg.maxPotAttempts} | hụt ${this.misses} | ${Math.round(this.game.loop.actualFps)} fps`,
      );
    }
  }

  private updateChickens(dt: number): void {
    const st = this.fsm.state;
    // Đàn gà luôn hoảng sợ tản ra theo bước chân của Trường Con (cả lúc mang gà đi nấu); đứng yên thì chỉ giật mình trong tầm gần
    const scaring = st !== 'PREPARING' && st !== 'CHICKENS_RUNNING' && st !== 'RESULT' && st !== 'GAME_OVER';
    const b = this.area.bounds;
    const cx = W / 2, cy = (b.minY + b.maxY) / 2;
    const R = this.tc.moving || st === 'CATCHING' ? GAME_CONFIG.panicRadius : GAME_CONFIG.panicRadius * 0.55;
    this.scaredBuf.length = 0;

    for (const c of this.list) {
      if (c.immuneMs > 0) c.immuneMs -= dt;
      const frozen = st === 'CATCHING' && this.catchPhase === 'reach' && c === this.target;
      if (scaring && !frozen && this.tc.x > -60 && c.canBeScared) {
        const d = Math.hypot(c.x - this.tc.x, c.y - this.tc.y);
        if (d < R) {
          c.flee(this.tc.x, this.tc.y, dt, 1 + (1 - d / R) * 0.45, cx, cy);
          this.scaredBuf.push(c);
          continue;
        }
      }
      c.tick(dt);
    }

    if (this.scaredBuf.length > 0) {
      this.cluckCd -= dt;
      if (this.cluckCd <= 0) { audio.play('cluck'); this.cluckCd = rand(220, 480); }
      this.chatCd -= dt;
      if (this.chatCd <= 0) { this.chatCd = rand(900, 1600); this.chickSay(pick(this.scaredBuf), CHICK_SCARED); }
    }

    if (this.holding && this.held) {
      this.held.setFacingLeft(this.tc.facing < 0);
      const hp = this.tc.handPoint();
      this.held.setPosition(hp.x, hp.y);
      this.held.setDepth(this.tc.depth + 1);
    }

    this.separate();
  }

  /**
   * Giãn các con gà để tên không chồng nhau: hai nhãn (hình chữ nhật trên đầu gà) không được đè lên nhau;
   * đẩy theo hướng phải dịch ít nhất (ưu tiên giãn ngang). Gà đi lang thang còn được giữ khoảng cách thân.
   */
  private separate(): void {
    const list = this.list, n = list.length;
    const bodyR = n > 25 ? 62 : n > 15 ? 56 : 48;
    const gap = 6;
    for (let i = 0; i < n; i++) {
      const a = list[i];
      if (!a.visible || !(a.isRoaming || a.chickenState === 'FLEE')) continue;
      for (let j = i + 1; j < n; j++) {
        const c = list[j];
        if (!c.visible || !(c.isRoaming || c.chickenState === 'FLEE')) continue;
        const dx = c.x - a.x, dy = c.y - a.y;
        const minDx = (a.labelW + c.labelW) / 2 + gap;
        const minDy = Math.max(a.labelH, c.labelH) + gap;
        const ox = minDx - Math.abs(dx), oy = minDy - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (oy / minDy <= ox / minDx) {
            const p = oy * 0.25 * (dy >= 0 ? 1 : -1);
            a.nudge(0, -p); c.nudge(0, p);
          } else {
            const p = ox * 0.25 * (dx >= 0 ? 1 : -1);
            a.nudge(-p, 0); c.nudge(p, 0);
          }
        } else if (a.isRoaming && c.isRoaming) {
          const d = Math.hypot(dx, dy);
          if (d > 0 && d < bodyR) {
            const push = (bodyR - d) * 0.08;
            a.nudge((-dx / d) * push, (-dy / d) * push);
            c.nudge((dx / d) * push, (dy / d) * push);
          }
        }
      }
    }
  }

  private runDust(dt: number): void {
    this.dustTimer -= dt;
    if (this.dustTimer > 0) return;
    this.dustTimer = 90;
    this.fx.dust(this.tc.x - this.tc.facing * 18, this.tc.y - 2);
    for (let i = 0; i < Math.min(2, this.scaredBuf.length); i++) {
      const c = this.scaredBuf[(Math.random() * this.scaredBuf.length) | 0];
      this.fx.dust(c.x, c.y - 2);
    }
  }

  private peek(): void {
    const c = this.held;
    if (!c) return;
    this.tweens.killTweensOf(c);
    c.setVisible(true).setAlpha(1).setScale(1.15).setDepth(POT_Y - 1);
    c.setPosition(POT_X + rand(-18, 18), POT_Y - 100);
    c.setFace(pick(['panic', 'cry', 'squawk', 'dizzy'] as const));
    c.flapMs = 500;
    this.tweens.add({
      targets: c, y: POT_Y - 178, duration: 200, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => { c.setVisible(false); },
    });
  }

  private updateFlow(dt: number): void {
    const t = this.fsm.time;
    const tm = GAME_CONFIG.timing;
    switch (this.fsm.state) {
      case 'PREPARING':
        if (t >= tm.preparingMs) this.enter('CHICKENS_RUNNING');
        break;

      case 'CHICKENS_RUNNING':
        if (t >= tm.chickensRunningMs) this.enter('CHARACTER_ENTERING');
        break;

      case 'CHARACTER_ENTERING':
        if (this.arrivedAt < 0) {
          if (this.tc.moveToward(ENTRY.x, ENTRY.y, GAME_CONFIG.truongCon.speed * 1.4, dt)) {
            this.arrivedAt = t;
            this.tc.setAnim('idle', 'smug'); // kính lóe sáng kiểu "ngầu lòi"
            this.tcSay(TC_LINES.enter);
          }
        } else if (t - this.arrivedAt >= 1000) {
          this.startAttempt();
        }
        break;

      case 'CHASING': {
        this.chaseTime += dt;
        this.goalTimer -= dt;
        const boost = 1 + Math.max(0, (this.chaseTime - GAME_CONFIG.chaseBoostAfterMs) / 1000) * 0.15;
        const arrived = this.tc.moveToward(this.goal.x, this.goal.y, GAME_CONFIG.truongCon.runSpeed * boost, dt);
        if (arrived || this.goalTimer <= 0) this.pickGoal();
        this.runDust(dt);
        this.tcChatCd -= dt;
        if (this.tcChatCd <= 0) { this.tcChatCd = rand(3500, 5500); this.tcSay(TC_LINES.chase); audio.play('chase'); }
        if (this.recovery > 0) { this.recovery -= dt; break; }
        // Gà nào lọt vào tầm chộp trong lúc lùa đàn thì bị chộp (không bám theo một con cố định)
        // đuổi quá lâu thì tầm chộp nới dần để vòng chơi luôn kết thúc
        let best: Chicken | null = null, bd = GAME_CONFIG.catchDistance + Math.max(0, (this.chaseTime - 12000) / 60);
        for (const c of this.list) {
          if (!this.isCatchable(c)) continue;
          const d = Math.hypot(c.x - this.tc.x, c.y - this.tc.y);
          if (d < bd) { bd = d; best = c; }
        }
        if (best) { this.target = best; this.enter('CATCHING'); }
        break;
      }

      case 'CATCHING': {
        const tg = this.target;
        if (!tg) { this.enter('CHASING'); break; }
        if (this.catchPhase === 'reach') {
          this.tc.face(tg.x - this.tc.x);
          if (t >= tm.catchAnimMs) {
            if (this.willMiss) this.onMiss(tg);
            else this.enter('CARRYING');
          }
        } else if (t >= tm.missStunMs) {
          this.recovery = 300;
          this.target = null;
          this.goalTimer = 0;
          this.enter('CHASING');
        }
        break;
      }

      case 'CARRYING':
        if (this.tc.moveToward(POT_STAND.x, POT_STAND.y, GAME_CONFIG.truongCon.speed * 1.2, dt)) {
          this.enter('PUTTING_IN_POT');
        }
        break;

      case 'PUTTING_IN_POT':
        this.tc.face(1);
        if (this.step === 0 && t >= 800) {
          this.pot.closeLid();
          this.tc.setAnim('holdPot');
          this.step = 1;
        }
        if (t >= 1400) this.enter('POT_SHAKING');
        break;

      case 'POT_SHAKING':
        this.featherTimer -= dt;
        if (this.featherTimer <= 0) {
          this.featherTimer = 220;
          this.fx.feather(POT_X + rand(-40, 40), POT_MOUTH_Y);
          audio.play('rattle');
        }
        this.peekTimer -= dt;
        if (this.peekTimer <= 0) { this.peekTimer = rand(550, 900); this.peek(); }
        if (t >= this.shakeMs) this.enter(this.willEscape ? 'CHICKEN_ESCAPING' : 'CHICKEN_COOKED');
        break;

      case 'CHICKEN_ESCAPING':
        if (this.step === 0 && t >= 800) {
          this.tc.setAnim('frustrated');
          this.tcSay(TC_LINES.rage);
          audio.play('angry');
          this.step = 1;
        }
        if (this.step === 1 && t >= tm.escapeAnimMs) {
          this.pot.closeLid();
          this.step = 2;
        }
        if (this.step === 2 && t >= tm.escapeAnimMs + GAME_CONFIG.roundDelayMs) {
          this.tc.setAnim('idle');
          this.startAttempt();
        }
        break;

      case 'CHICKEN_COOKED':
        if (this.step === 0 && t >= 900) {
          this.step = 1;
          this.pot.openLid();
          audio.play('lidPop');
          audio.play('cooked');
          this.cameras.main.flash(250, 255, 255, 255);
          this.showPlate();
        }
        if (this.step === 1 && t < tm.cookedRevealMs - 300) {
          this.steamTimer -= dt;
          if (this.steamTimer <= 0) {
            this.steamTimer = 90;
            this.fx.steam(POT_X + rand(-40, 40), POT_MOUTH_Y);
          }
        }
        if (t >= tm.cookedRevealMs) {
          const c = this.held;
          this.held = null;
          this.fsm.set('RESULT');
          if (c) {
            c.markCooked();
            gameBus.emit(EVT.result, { id: c.studentId, name: c.studentName } as Student);
          }
        }
        break;

      default:
        break;
    }
  }

  /** Bắt hụt: Trường Con ngã sấp, gà lè lưỡi trêu; có xác suất chuyển sang lùa con khác. */
  private onMiss(tg: Chicken): void {
    this.misses++;
    this.emitStats();
    this.catchPhase = 'missed';
    this.fsm.time = 0;
    this.tc.setAnim('miss');
    this.tcSay(TC_LINES.miss);
    audio.play('fall');
    audio.play('miss');
    this.cameras.main.shake(200, 0.006);
    for (let i = 0; i < 4; i++) this.fx.dust(this.tc.x + this.tc.facing * rand(10, 60), this.tc.y - 2);
    // Chuyển sang lùa con khác (miễn nhiễm lâu) hoặc có thể quay lại con này (miễn nhiễm ngắn)
    tg.immuneMs = Math.random() < GAME_CONFIG.switchAfterMissChance ? 3000 : 700;
    tg.tease(900);
    tg.setFace('tease');
    this.chickSay(tg, CHICK_TEASE);
  }

  /** Gà luộc nguyên con trên đĩa trồi lên từ nồi, kèm tên học sinh. */
  private showPlate(): void {
    this.plate.setPosition(POT_X, POT_MOUTH_Y).setScale(0.3).setVisible(true);
    this.tweens.add({ targets: this.plate, y: POT_Y - 200, scale: 1, duration: 700, ease: 'Back.easeOut' });
    const name = this.held?.studentName ?? '';
    this.winnerText.setText(name).setScale(1);
    const maxW = 440;
    if (this.winnerText.width > maxW) this.winnerText.setScale(maxW / this.winnerText.width);
    const half = (this.winnerText.width * this.winnerText.scaleX) / 2;
    this.winnerText.setPosition(Phaser.Math.Clamp(POT_X, half + 10, W - half - 10), POT_Y - 345).setVisible(true);
  }
}
