import { useEffect, useState } from 'react';
import type { RoundStats, Settings, Student } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GameHUD } from '../components/GameHUD';
import { MainMenu } from '../components/MainMenu';
import { ResultPanel } from '../components/ResultPanel';
import { SettingsPanel } from '../components/SettingsPanel';
import { EVT, gameBus } from '../game/events';
import { audio } from '../game/managers/AudioManager';
import { loadSettings, saveSettings } from '../game/managers/SettingsStore';
import { exportClasses, loadClassData, newClass, parseImport, saveClassData, type ClassData } from '../game/managers/ClassStore';
import { PhaserGame } from './PhaserGame';

type ResultState =
  | { kind: 'student'; student: Student }
  | { kind: 'finished' }
  | { kind: 'nocatch'; attempts: number }
  | null;
type Confirm = 'reset' | 'home' | null;

export function App() {
  const [screen, setScreen] = useState<'menu' | 'playing'>('menu');
  const [classData, setClassData] = useState<ClassData>(loadClassData);
  const current = classData.classes.find((c) => c.id === classData.selectedId) ?? classData.classes[0];
  const text = current.text;
  const setText = (v: string) => setClassData((d) => ({
    ...d, classes: d.classes.map((c) => (c.id === d.selectedId ? { ...c, text: v, updatedAt: Date.now() } : c)),
  }));
  const selectClass = (id: string) => setClassData((d) => ({ ...d, selectedId: id }));
  const createClass = (name: string) => setClassData((d) => { const c = newClass(name); return { classes: [...d.classes, c], selectedId: c.id }; });
  const renameClass = (name: string) => setClassData((d) => ({ ...d, classes: d.classes.map((c) => (c.id === d.selectedId ? { ...c, name } : c)) }));
  const deleteClass = () => setClassData((d) => {
    const rest = d.classes.filter((c) => c.id !== d.selectedId);
    if (rest.length === 0) { const c = newClass('Lớp 1'); return { classes: [c], selectedId: c.id }; }
    return { classes: rest, selectedId: rest[0].id };
  });
  const exportData = () => {
    const url = URL.createObjectURL(new Blob([exportClasses(classData)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'danh-sach-lop-truong-con-bat-ga.json'; a.click();
    URL.revokeObjectURL(url);
  };
  const importData = (file: File) => {
    void file.text().then((t) => {
      const list = parseImport(t);
      if (!list) { window.alert('File không đúng định dạng sao lưu của game.'); return; }
      setClassData((d) => ({ classes: [...d.classes, ...list], selectedId: list[0].id }));
      window.alert(`Đã thêm ${list.length} lớp từ file sao lưu.`);
    });
  };
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [remaining, setRemaining] = useState<Student[]>([]);
  const [calledCount, setCalledCount] = useState(0);
  const [result, setResult] = useState<ResultState>(null);
  const [stats, setStats] = useState<RoundStats>({ attempts: 0, maxAttempts: settings.maxPotAttempts, misses: 0 });
  const [roundKey, setRoundKey] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);

  useEffect(() => { saveClassData(classData); }, [classData]);
  useEffect(() => { saveSettings(settings); }, [settings]);

  // Âm thanh: áp dụng cài đặt, nhạc nền chỉ chạy ở màn hình chơi, tạm dừng khi người chơi bấm tạm dừng
  useEffect(() => { audio.configure(settings); }, [settings.soundOn, settings.volume, settings.bgmVolume, settings.sfxVolume, settings.voiceVolume]);
  useEffect(() => { if (screen === 'playing') audio.startBgm(); else audio.stopBgm(); }, [screen]);
  useEffect(() => { audio.setPaused(screen === 'playing' && userPaused); }, [screen, userPaused]);

  // Nhận sự kiện từ game
  useEffect(() => {
    if (screen !== 'playing') return;
    const onResult = (s: Student) => setResult({ kind: 'student', student: s });
    const onNoCatch = (attempts: number) => setResult({ kind: 'nocatch', attempts });
    const onStats = (st: RoundStats) => setStats(st);
    gameBus.on(EVT.result, onResult);
    gameBus.on(EVT.noCatch, onNoCatch);
    gameBus.on(EVT.stats, onStats);
    return () => {
      gameBus.off(EVT.result, onResult);
      gameBus.off(EVT.noCatch, onNoCatch);
      gameBus.off(EVT.stats, onStats);
    };
  }, [screen]);

  const gamePaused = userPaused || result !== null || showSettings || confirm !== null;

  const start = (students: Student[]) => {
    audio.unlock(); // cần một thao tác bấm của người dùng để trình duyệt cho phát tiếng
    setAllStudents(students); setRemaining(students); setCalledCount(0);
    setResult(null); setUserPaused(false); setScreen('playing');
  };
  const next = () => {
    if (!result || result.kind !== 'student') return;
    const rest = remaining.filter((s) => s.id !== result.student.id);
    setRemaining(rest);
    setCalledCount((c) => c + 1);
    if (rest.length > 0) { setResult(null); setRoundKey((k) => k + 1); }
    else setResult({ kind: 'finished' });
  };
  const retry = () => { setResult(null); setRoundKey((k) => k + 1); };
  const replay = () => {
    setRemaining(allStudents); setCalledCount(0); setResult(null);
    setUserPaused(false); setConfirm(null); setRoundKey((k) => k + 1);
  };
  const home = () => { setScreen('menu'); setResult(null); setConfirm(null); setUserPaused(false); };
  const toggleSound = () => setSettings((s) => ({ ...s, soundOn: !s.soundOn }));

  return (
    <>
      {screen === 'menu' ? (
        <MainMenu
          classes={classData.classes} selectedId={current.id} text={text} onTextChange={setText}
          onSelectClass={selectClass} onCreateClass={createClass} onRenameClass={renameClass}
          onDeleteClass={deleteClass} onExport={exportData} onImport={importData}
          soundOn={settings.soundOn} onToggleSound={toggleSound}
          onOpenSettings={() => setShowSettings(true)} onStart={start}
        />
      ) : (
        <div className="play-screen">
          <GameHUD
            remaining={remaining.length} total={allStudents.length} called={calledCount}
            stats={{ ...stats, maxAttempts: settings.maxPotAttempts }}
            paused={userPaused} soundOn={settings.soundOn}
            onTogglePause={() => setUserPaused((p) => !p)} onToggleSound={toggleSound}
            onOpenSettings={() => setShowSettings(true)} onHome={() => setConfirm('home')}
          />
          <div className="game-area">
            <PhaserGame students={remaining} paused={gamePaused} settings={settings} roundKey={roundKey} />
            {userPaused && result === null && (
              <div className="pause-banner">
                <div>⏸ TẠM DỪNG</div>
                <button className="btn green big" onClick={() => setUserPaused(false)}>▶ TIẾP TỤC</button>
              </div>
            )}
          </div>
          {result && (
            <ResultPanel
              kind={result.kind}
              student={result.kind === 'student' ? result.student : undefined}
              remainingAfter={remaining.length - 1}
              attempts={result.kind === 'nocatch' ? result.attempts : 0}
              onNext={next} onRetry={retry} onReplay={() => setConfirm('reset')} onHome={home}
            />
          )}
        </div>
      )}
      {showSettings && <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />}
      {confirm === 'reset' && (
        <ConfirmDialog title="Chơi lại từ đầu?" message="Tiến trình hiện tại sẽ bị xóa, toàn bộ danh sách học sinh sẽ được đưa về ban đầu." confirmText="Chơi lại" onConfirm={replay} onCancel={() => setConfirm(null)} />
      )}
      {confirm === 'home' && (
        <ConfirmDialog title="Về màn hình chính?" message="Tiến trình của vòng chơi hiện tại sẽ bị mất (danh sách học sinh vẫn được giữ)." confirmText="Về màn hình chính" onConfirm={home} onCancel={() => setConfirm(null)} />
      )}
    </>
  );
}
