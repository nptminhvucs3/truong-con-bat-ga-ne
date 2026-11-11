import { GAME_CONFIG } from '../config/gameConfig';
import type { Settings } from '../../types';

const SETTINGS_KEY = 'tcbg.settings';
const LIST_KEY = 'tcbg.students';

export const defaultSettings: Settings = {
  soundOn: true,
  volume: GAME_CONFIG.defaultVolume,
  bgmVolume: 0.4,   // nhạc nền nhỏ hơn
  sfxVolume: 1,
  voiceVolume: 1.3, // lồng tiếng to hơn hiệu ứng một chút
  catchMissChance: GAME_CONFIG.catchMissChance,
  escapeChance: GAME_CONFIG.escapeChance,
  maxPotAttempts: GAME_CONFIG.maxPotAttempts,
  nameMode: 'auto',
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
  } catch { return { ...defaultSettings }; }
}
export function saveSettings(s: Settings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* bỏ qua */ }
}
export function loadStudentText(): string {
  try { return localStorage.getItem(LIST_KEY) ?? ''; } catch { return ''; }
}
export function saveStudentText(t: string): void {
  try { localStorage.setItem(LIST_KEY, t); } catch { /* bỏ qua */ }
}
