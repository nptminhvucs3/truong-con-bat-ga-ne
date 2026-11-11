import type { Settings } from '../types';
import { audio } from '../game/managers/AudioManager';
import { defaultSettings } from '../game/managers/SettingsStore';

interface Props { settings: Settings; onChange: (s: Settings) => void; onClose: () => void; }

export function SettingsPanel({ settings: s, onChange, onClose }: Props) {
  return (
    <div className="overlay top" role="dialog" aria-modal="true">
      <div className="panel settings">
        <h2>⚙ Cài đặt</h2>
        <label className="row">
          <span>Âm thanh</span>
          <input type="checkbox" checked={s.soundOn} onChange={(e) => onChange({ ...s, soundOn: e.target.checked })} />
        </label>
        <label className="row">
          <span>Âm thanh tổng: {Math.round(s.volume * 100)}%</span>
          <input type="range" min={0} max={100} value={Math.round(s.volume * 100)} onChange={(e) => onChange({ ...s, volume: Number(e.target.value) / 100 })} />
        </label>
        <details className="vol-details">
          <summary>Chỉnh chi tiết âm lượng</summary>
          <label className="row">
            <span>Nhạc nền: {Math.round(s.bgmVolume * 100)}%</span>
            <input type="range" min={0} max={200} value={Math.round(s.bgmVolume * 100)} onChange={(e) => onChange({ ...s, bgmVolume: Number(e.target.value) / 100 })} />
          </label>
          <label className="row">
            <span>Hiệu ứng: {Math.round(s.sfxVolume * 100)}%</span>
            <input type="range" min={0} max={200} value={Math.round(s.sfxVolume * 100)} onChange={(e) => onChange({ ...s, sfxVolume: Number(e.target.value) / 100 })} />
          </label>
          <label className="row">
            <span>Lồng tiếng: {Math.round(s.voiceVolume * 100)}%</span>
            <input type="range" min={0} max={200} value={Math.round(s.voiceVolume * 100)} onChange={(e) => onChange({ ...s, voiceVolume: Number(e.target.value) / 100 })} />
          </label>
          <div className="btn-row">
            <button className="btn small ghost" onClick={() => { audio.unlock(); audio.play('cluck'); }}>▶ Nghe thử hiệu ứng</button>
            <button className="btn small ghost" onClick={() => { audio.unlock(); audio.play('catch'); }}>▶ Nghe thử lồng tiếng</button>
          </div>
        </details>
        <label className="row">
          <span>Xác suất bắt hụt: {Math.round(s.catchMissChance * 100)}%</span>
          <input type="range" min={0} max={90} value={Math.round(s.catchMissChance * 100)} onChange={(e) => onChange({ ...s, catchMissChance: Number(e.target.value) / 100 })} />
        </label>
        <label className="row">
          <span>Xác suất gà trốn thoát: {Math.round(s.escapeChance * 100)}%</span>
          <input type="range" min={0} max={100} value={Math.round(s.escapeChance * 100)} onChange={(e) => onChange({ ...s, escapeChance: Number(e.target.value) / 100 })} />
        </label>
        <label className="row">
          <span>Số lượt đưa gà vào nồi tối đa</span>
          <input type="number" min={1} max={10} value={s.maxPotAttempts} onChange={(e) => onChange({ ...s, maxPotAttempts: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })} />
        </label>
        <label className="row">
          <span>Hiển thị tên trên đầu gà</span>
          <select value={s.nameMode} onChange={(e) => onChange({ ...s, nameMode: e.target.value as Settings['nameMode'] })}>
            <option value="auto">Tự động (rút gọn khi đông)</option>
            <option value="full">Đầy đủ</option>
            <option value="short">Rút gọn (chữ cuối)</option>
          </select>
        </label>
        <div className="btn-row">
          <button className="btn" onClick={() => onChange({ ...defaultSettings })}>Khôi phục mặc định</button>
          <button className="btn green" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
