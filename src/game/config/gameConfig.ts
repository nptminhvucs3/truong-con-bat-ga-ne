/** Mọi thông số gameplay tập trung tại đây. */
export const GAME_CONFIG = {
  world: { width: 1280, height: 720 },
  chicken: { speed: 60, runSpeed: 165 },
  truongCon: { speed: 130, runSpeed: 260 },
  catchDistance: 48,
  panicRadius: 230,           // gà trong bán kính này sẽ hoảng loạn bỏ chạy khỏi Trường Con
  switchAfterMissChance: 0.6, // bắt hụt: xác suất chuyển sang lùa con khác (không bám con vừa hụt)
  chaseBoostAfterMs: 6000, // đuổi quá lâu thì Trường Con tăng tốc dần
  catchMissChance: 0.2,
  escapeChance: 0.6,
  maxPotAttempts: 3,
  potShakeMs: { min: 2500, max: 4500 },
  roundDelayMs: 1200,
  timing: {
    preparingMs: 600,
    chickensRunningMs: 2500,
    catchAnimMs: 550,
    missStunMs: 1500,
    escapeAnimMs: 1800,
    cookedRevealMs: 3000,
  },
  defaultVolume: 0.7,
} as const;

/** Đường dẫn asset tập trung (tương đối với public/, dùng BASE_URL để chạy trên subpath). */
const base = import.meta.env.BASE_URL;
export const ASSETS = {
  truongCon: `${base}assets/characters/truong-con/truong-con.png`,
  // Khung hình của Trường Con: public/assets/characters/truong-con/frames/<tên>.png
  truongConFrame: (name: string) => `${base}assets/characters/truong-con/frames/${name}.png`,
  plateChicken: `${base}assets/objects/plate-chicken.png`,
} as const;
