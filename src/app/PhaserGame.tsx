import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import type { Settings, Student } from '../types';
import { GAME_CONFIG } from '../game/config/gameConfig';
import { EVT, gameBus } from '../game/events';
import { BootScene } from '../game/scenes/BootScene';
import { MainGameScene } from '../game/scenes/MainGameScene';

interface Props { students: Student[]; paused: boolean; settings: Settings; roundKey: number; }

export function PhaserGame({ students, paused, settings, roundKey }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const studentsRef = useRef(students);
  const settingsRef = useRef(settings);
  const lastRound = useRef(roundKey);
  studentsRef.current = students;
  settingsRef.current = settings;

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ref.current!,
      width: GAME_CONFIG.world.width,
      height: GAME_CONFIG.world.height,
      backgroundColor: '#6abf4b',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      callbacks: {
        preBoot: (g: Phaser.Game) => {
          g.registry.set('students', studentsRef.current);
          g.registry.set('settings', settingsRef.current);
        },
      },
      scene: [BootScene, MainGameScene],
    });
    gameRef.current = game;
    return () => { game.destroy(true); gameRef.current = null; };
  }, []);

  useEffect(() => {
    gameRef.current?.registry.set('students', students);
    gameBus.emit(EVT.sync, students);
  }, [students]);

  useEffect(() => {
    gameRef.current?.registry.set('settings', settings);
    gameBus.emit(EVT.settings);
  }, [settings]);

  useEffect(() => {
    if (lastRound.current !== roundKey) {
      lastRound.current = roundKey;
      gameBus.emit(EVT.startRound);
    }
  }, [roundKey]);

  useEffect(() => { gameBus.emit(paused ? EVT.pause : EVT.resume); }, [paused]);

  return <div ref={ref} className="game-wrap" />;
}
