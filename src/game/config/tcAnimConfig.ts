/**
 * Animation chạy/đi của Trường Con do bạn cung cấp.
 *
 * Cách dùng:
 *  1. Chép file ảnh tổng hợp frame (png) và file json vào  public/assets/characters/truong-con/anim/
 *  2. Bỏ comment dòng `run` / `walk` bên dưới và sửa tên file, fps cho đúng.
 *  3. Nếu json là atlas (TexturePacker / Aseprite / Phaser): khai báo `json`.
 *     Nếu chỉ có ảnh lưới đều: bỏ `json`, điền `frameWidth` và `frameHeight`.
 *  4. Chỉnh `originY` (chân nhân vật nằm ở đâu theo chiều cao khung, 0..1), `scale` (to/nhỏ) và `facing`
 *     (nhân vật trong ảnh đang quay sang 'right' hay 'left') cho khớp.
 * Chưa khai báo hoặc nạp lỗi thì game vẫn dùng bộ khung hình chạy có sẵn.
 */
export interface TcAnimDef {
  key: string;            // tên texture trong Phaser (đặt tùy ý, không trùng nhau)
  png: string;            // đường dẫn ảnh, tính từ thư mục public/
  json?: string;          // đường dẫn json atlas (nếu có)
  frameWidth?: number;    // chỉ dùng khi không có json
  frameHeight?: number;
  fps: number;
  originY?: number;       // mặc định 0.95
  scale?: number;         // mặc định 1
  facing?: 'right' | 'left'; // mặc định 'right'
}

export const TC_CUSTOM_TARGET_H = 255; // chiều cao hiển thị của một khung (px, trước khi thu nhỏ chung)

export const TC_CUSTOM_ANIMS: Partial<Record<'run' | 'walk', TcAnimDef>> = {
  run: { key: 'tc_run', png: 'assets/characters/truong-con/anim/run.png', json: 'assets/characters/truong-con/anim/run.json', frameWidth: 256, frameHeight: 256, fps: 14, originY: 0.91, scale: 1.6 },
  walk: { key: 'tc_walk', png: 'assets/characters/truong-con/anim/walk.png', json: 'assets/characters/truong-con/anim/walk.json', frameWidth: 256, frameHeight: 256, fps: 30, originY: 0.91, scale: 1.6 },
};
