import { useRef, useState } from 'react';
import type { ClassItem } from '../game/managers/ClassStore';
import { parseStudentList } from '../game/managers/StudentManager';
import { ConfirmDialog } from './ConfirmDialog';
import { PromptDialog } from './PromptDialog';

interface Props {
  classes: ClassItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}
type Dlg = 'create' | 'rename' | 'delete' | null;

export function ClassBar(p: Props) {
  const [dlg, setDlg] = useState<Dlg>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cur = p.classes.find((c) => c.id === p.selectedId);

  return (
    <div className="class-bar">
      <label htmlFor="class-select">Lớp:</label>
      <select id="class-select" value={p.selectedId} onChange={(e) => p.onSelect(e.target.value)}>
        {p.classes.map((c) => (
          <option key={c.id} value={c.id}>{c.name} ({parseStudentList(c.text).students.length} HS)</option>
        ))}
      </select>
      <button type="button" className="btn small green" onClick={() => setDlg('create')}>➕ Thêm lớp</button>
      <button type="button" className="btn small" onClick={() => setDlg('rename')}>✏ Đổi tên</button>
      <button type="button" className="btn small red" onClick={() => setDlg('delete')}>🗑 Xóa lớp</button>
      <button type="button" className="btn small ghost" onClick={p.onExport} title="Tải file sao lưu tất cả các lớp">⬇ Sao lưu</button>
      <button type="button" className="btn small ghost" onClick={() => fileRef.current?.click()} title="Thêm các lớp từ file sao lưu">⬆ Khôi phục</button>
      <input
        ref={fileRef} type="file" accept="application/json,.json" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onImport(f); e.target.value = ''; }}
      />
      {dlg === 'create' && <PromptDialog title="Thêm lớp mới" initial="" confirmText="Thêm" onConfirm={(n) => { p.onCreate(n); setDlg(null); }} onCancel={() => setDlg(null)} />}
      {dlg === 'rename' && cur && <PromptDialog title="Đổi tên lớp" initial={cur.name} confirmText="Lưu" onConfirm={(n) => { p.onRename(n); setDlg(null); }} onCancel={() => setDlg(null)} />}
      {dlg === 'delete' && cur && (
        <ConfirmDialog title={`Xóa lớp "${cur.name}"?`} message="Toàn bộ danh sách học sinh của lớp này sẽ bị xóa và không khôi phục được (trừ khi bạn đã sao lưu)." confirmText="Xóa lớp" onConfirm={() => { p.onDelete(); setDlg(null); }} onCancel={() => setDlg(null)} />
      )}
    </div>
  );
}
