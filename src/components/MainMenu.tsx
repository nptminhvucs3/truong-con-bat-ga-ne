import { useState } from 'react';
import type { Student } from '../types';
import { ASSETS } from '../game/config/gameConfig';
import type { ClassItem } from '../game/managers/ClassStore';
import { parseStudentList } from '../game/managers/StudentManager';
import { ClassBar } from './ClassBar';
import { StudentInput } from './StudentInput';

interface Props {
  classes: ClassItem[];
  selectedId: string;
  text: string;
  onSelectClass: (id: string) => void;
  onCreateClass: (name: string) => void;
  onRenameClass: (name: string) => void;
  onDeleteClass: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onTextChange: (v: string) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onStart: (students: Student[]) => void;
}

export function MainMenu(p: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    const { students } = parseStudentList(p.text);
    if (students.length === 0) {
      setError('Danh sách đang trống! Hãy dán ít nhất một tên học sinh.');
      return;
    }
    setError(null);
    p.onStart(students);
  };

  return (
    <div className="menu-screen">
      <div className="menu-top">
        <button className="btn small" onClick={p.onToggleSound} aria-label="Bật/tắt âm thanh">{p.soundOn ? '🔊 Âm thanh: Bật' : '🔇 Âm thanh: Tắt'}</button>
        <button className="btn small" onClick={p.onOpenSettings}>⚙ Cài đặt</button>
      </div>
      <h1 className="title">TRƯỜNG CON<br />BẮT GÀ</h1>
      <div className="menu-card">
        <div className="menu-hero">
          <img src={ASSETS.truongCon} alt="Trường Con" />
        </div>
        <div className="menu-form">
          <ClassBar
            classes={p.classes} selectedId={p.selectedId} onSelect={(id) => { setError(null); p.onSelectClass(id); }}
            onCreate={p.onCreateClass} onRename={p.onRenameClass} onDelete={p.onDeleteClass}
            onExport={p.onExport} onImport={p.onImport}
          />
          <StudentInput value={p.text} onChange={(v) => { setError(null); p.onTextChange(v); }} error={error} />
          <ol className="howto">
            <li>Chọn lớp (hoặc thêm lớp mới), dán cột tên học sinh từ Excel vào ô trên. Danh sách tự lưu theo lớp.</li>
            <li>Bấm <b>BẮT ĐẦU</b>, Trường Con sẽ lùa và bắt gà.</li>
            <li>Con gà nào bị luộc chín, bạn đó được gọi tên!</li>
          </ol>
          <button className="btn big green" onClick={handleStart}>▶ BẮT ĐẦU</button>
        </div>
      </div>
    </div>
  );
}
