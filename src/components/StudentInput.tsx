import { useMemo } from 'react';
import { parseStudentList } from '../game/managers/StudentManager';

interface Props { value: string; onChange: (v: string) => void; error: string | null; }

const SAMPLE_5 = ['Nguyễn Văn A', 'Trần Văn B', 'Lê Thị C', 'Phạm Văn D', 'Hoàng Thị E'].join('\n');
const SAMPLE_1 = 'Nguyễn Văn A';
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ'];
const DEM = ['Văn', 'Thị', 'Minh', 'Quốc', 'Thu', 'Anh'];
const TEN = ['An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hiếu', 'Hoa', 'Hùng', 'Khánh', 'Lan', 'Linh', 'Long', 'Mai',
  'Nam', 'Nga', 'Oanh', 'Phúc', 'Phương', 'Quân', 'Sơn', 'Tâm', 'Thảo', 'Trang', 'Tuấn', 'Uyên', 'Việt', 'Xuân', 'Yến'];
const SAMPLE_30 = TEN.map((t, i) => `${HO[i % 6]} ${DEM[(i * 5) % 6]} ${t}`).join('\n');

export function StudentInput({ value, onChange, error }: Props) {
  const { students, duplicateCount } = useMemo(() => parseStudentList(value), [value]);
  return (
    <div className="student-input">
      <label htmlFor="students">Dán danh sách học sinh (mỗi dòng một tên)</label>
      <textarea
        id="students"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'Nguyễn Văn A\nTrần Văn B\nLê Thị C'}
        rows={9}
        spellCheck={false}
      />
      <div className="si-row">
        <span className="badge">🐔 Hợp lệ: <b>{students.length}</b></span>
        {duplicateCount > 0 && <span className="badge warn">⚠ {duplicateCount} tên trùng (vẫn tạo gà riêng)</span>}
        <span className="spacer" />
        {!value && (
          <>
            <button type="button" className="btn small ghost" onClick={() => onChange(SAMPLE_1)}>Mẫu 1</button>
            <button type="button" className="btn small ghost" onClick={() => onChange(SAMPLE_5)}>Mẫu 5</button>
            <button type="button" className="btn small ghost" onClick={() => onChange(SAMPLE_30)}>Mẫu 30</button>
          </>
        )}
        <button type="button" className="btn small ghost" disabled={!value}
          onClick={() => { if (window.confirm('Xóa toàn bộ danh sách tên của lớp này?')) onChange(''); }}>🗑 Xóa danh sách</button>
      </div>
      {error && <div className="error" role="alert">{error}</div>}
    </div>
  );
}
