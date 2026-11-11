/** Các khung hình của Trường Con (được tách từ bảng chạy + bảng biểu cảm do bạn cung cấp). */
export const TC_RUN = ['run0', 'run1', 'run2', 'run3', 'run4', 'run5', 'run6', 'run7'] as const;
export const TC_POSES = [
  'normal', 'happy', 'laughing', 'angry', 'surprised', 'scared',
  'confused', 'scared2', 'cheer', 'excited', 'victory', 'sad',
] as const;
export const TC_FRAMES: readonly string[] = [...TC_POSES, ...TC_RUN];

// Mỗi khung nằm trên cùng một canvas; điểm neo = giữa mặt theo chiều ngang, đường chân ở đáy (xem frames.json)
export const TC_CANVAS: [number, number] = [212, 277];
export const TC_ANCHOR: [number, number] = [128, 271];
export const TC_STAND_H = 250; // chiều cao nhân vật đứng thẳng trong khung (px)
