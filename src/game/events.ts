import Phaser from 'phaser';

/** Cầu nối giữa React (UI) và Phaser (game). */
export const gameBus = new Phaser.Events.EventEmitter();
export const EVT = {
  sync: 'sync-students',       // React -> Game: danh sách học sinh còn lại
  pause: 'pause',              // React -> Game
  resume: 'resume',            // React -> Game
  startRound: 'start-round',   // React -> Game: bắt đầu vòng mới
  result: 'round-result',      // Game -> React: có học sinh bị luộc chín (payload: Student)
  noCatch: 'round-nocatch',    // Game -> React: hết lượt mà không bắt được gà
  settings: 'settings-changed', // React -> Game: cài đặt thay đổi
  stats: 'round-stats',        // Game -> React: RoundStats
} as const;
