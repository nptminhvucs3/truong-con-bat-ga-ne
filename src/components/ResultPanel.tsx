import type { Student } from '../types';
import { ASSETS } from '../game/config/gameConfig';

interface Props {
  kind: 'student' | 'finished' | 'nocatch';
  student?: Student;
  remainingAfter: number;
  attempts: number;
  onNext: () => void;
  onRetry: () => void;
  onReplay: () => void;
  onHome: () => void;
}

export function ResultPanel({ kind, student, remainingAfter, attempts, onNext, onRetry, onReplay, onHome }: Props) {
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <i key={i} style={{ ['--x' as string]: `${(i * 37) % 100}%`, ['--d' as string]: `${(i % 7) * 0.35}s`, ['--c' as string]: ['#ffd43b', '#ff6b6b', '#4dabf7', '#69db7c', '#da77f2'][i % 5] }} />
        ))}
      </div>
      <div className="panel result">
        {kind === 'student' && student ? (
          <>
            <h2 className="congrats">🎉 CHÚC MỪNG! HÔM NAY GỌI TÊN:</h2>
            <div className="winner">{student.name}</div>
            <img className="plate" src={ASSETS.plateChicken} alt="Gà luộc nguyên con" />
            <p className="muted">{remainingAfter > 0 ? `Còn ${remainingAfter} học sinh chưa được gọi.` : 'Đây là học sinh cuối cùng trong danh sách.'}</p>
            <div className="btn-row">
              <button className="btn green big" onClick={onNext}>BẮT TIẾP</button>
              <button className="btn big" onClick={onReplay}>CHƠI LẠI</button>
            </div>
          </>
        ) : kind === 'nocatch' ? (
          <>
            <h2 className="congrats sad">😅 KHÔNG BẮT ĐƯỢC GÀ!</h2>
            <p>{attempts > 0 ? `Cả ${attempts} con gà đều trốn thoát khỏi nồi.` : 'Không còn con gà nào để bắt.'} Chưa ai bị gọi tên lượt này.</p>
            <div className="btn-row">
              <button className="btn green big" onClick={onRetry}>THỬ LẠI</button>
              <button className="btn big" onClick={onHome}>VỀ MÀN HÌNH CHÍNH</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="congrats">🏁 ĐÃ HOÀN THÀNH DANH SÁCH!</h2>
            <p>Tất cả học sinh đã được gọi tên.</p>
            <div className="btn-row">
              <button className="btn green big" onClick={onReplay}>CHƠI LẠI</button>
              <button className="btn big" onClick={onHome}>VỀ MÀN HÌNH CHÍNH</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
