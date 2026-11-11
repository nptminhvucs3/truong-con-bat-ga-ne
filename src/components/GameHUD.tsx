import type { RoundStats } from '../types';

interface Props {
  remaining: number;
  total: number;
  called: number;
  stats: RoundStats;
  paused: boolean;
  soundOn: boolean;
  onTogglePause: () => void;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onHome: () => void;
}

export function GameHUD(p: Props) {
  return (
    <div className="hud">
      <button className="btn small" onClick={p.onHome}>🏠 Màn hình chính</button>
      <div className="stat">🐔 Còn lại: <b>{p.remaining}</b>/{p.total}</div>
      <div className="stat">🎯 Đã gọi: <b>{p.called}</b></div>
      <div className="stat">🍲 Lượt nồi: <b>{p.stats.attempts}</b>/{p.stats.maxAttempts}</div>
      <div className="stat">💨 Bắt hụt: <b>{p.stats.misses}</b></div>
      <span className="spacer" />
      <button className="btn small" onClick={p.onTogglePause}>{p.paused ? '▶ Tiếp tục' : '⏸ Tạm dừng'}</button>
      <button className="btn small" onClick={p.onToggleSound} aria-label="Bật/tắt âm thanh">{p.soundOn ? '🔊' : '🔇'}</button>
      <button className="btn small" onClick={p.onOpenSettings} aria-label="Cài đặt">⚙</button>
    </div>
  );
}
