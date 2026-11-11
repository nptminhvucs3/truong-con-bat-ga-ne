import { useState } from 'react';

interface Props { title: string; initial: string; confirmText: string; onConfirm: (value: string) => void; onCancel: () => void; }

export function PromptDialog({ title, initial, confirmText, onConfirm, onCancel }: Props) {
  const [v, setV] = useState(initial);
  const ok = v.trim().length > 0;
  return (
    <div className="overlay top" role="dialog" aria-modal="true">
      <div className="panel small">
        <h2>{title}</h2>
        <input
          className="text-input" autoFocus value={v} maxLength={40} placeholder="Ví dụ: 10A1"
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && ok) onConfirm(v.trim()); if (e.key === 'Escape') onCancel(); }}
        />
        <div className="btn-row">
          <button className="btn green" disabled={!ok} onClick={() => onConfirm(v.trim())}>{confirmText}</button>
          <button className="btn" onClick={onCancel}>Hủy</button>
        </div>
      </div>
    </div>
  );
}
