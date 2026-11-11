export interface Student { id: string; name: string; }

export interface Settings {
  soundOn: boolean;
  volume: number;          // âm thanh tổng 0..1
  bgmVolume: number;       // nhạc nền (0..2, nhân với âm tổng)
  sfxVolume: number;       // hiệu ứng âm thanh (0..2)
  voiceVolume: number;     // lồng tiếng của bạn (0..2)
  catchMissChance: number; // 0..1
  escapeChance: number;    // 0..1
  maxPotAttempts: number;
  nameMode: 'auto' | 'full' | 'short'; // cách hiển thị tên trên đầu gà
}

export interface RoundStats { attempts: number; maxAttempts: number; misses: number; }

export type GameState =
  | 'PREPARING' | 'CHICKENS_RUNNING' | 'CHARACTER_ENTERING' | 'CHASING'
  | 'CATCHING' | 'CARRYING' | 'PUTTING_IN_POT' | 'POT_SHAKING'
  | 'CHICKEN_ESCAPING' | 'CHICKEN_COOKED' | 'RESULT' | 'GAME_OVER';
