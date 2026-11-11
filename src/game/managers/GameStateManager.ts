import type { GameState } from '../../types';

/** State machine đơn giản: lưu trạng thái hiện tại và thời gian (ms) đã ở trong trạng thái đó. */
export class GameStateManager {
  state: GameState = 'PREPARING';
  time = 0;
  set(next: GameState): void { this.state = next; this.time = 0; }
  tick(dt: number): void { this.time += dt; }
  is(s: GameState): boolean { return this.state === s; }
}
