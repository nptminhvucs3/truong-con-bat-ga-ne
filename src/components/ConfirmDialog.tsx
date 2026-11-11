interface Props { title: string; message: string; confirmText: string; onConfirm: () => void; onCancel: () => void; }

export function ConfirmDialog({ title, message, confirmText, onConfirm, onCancel }: Props) {
  return (
    <div className="overlay top" role="dialog" aria-modal="true">
      <div className="panel small">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="btn-row">
          <button className="btn red" onClick={onConfirm}>{confirmText}</button>
          <button className="btn" onClick={onCancel}>Hủy</button>
        </div>
      </div>
    </div>
  );
}
