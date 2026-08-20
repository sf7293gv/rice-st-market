export default function ConfirmDialog({ open, onCancel, onConfirm, title, message }) {
  if (!open) return null

  return (
    <div className="adm-confirm-bg" onClick={onCancel}>
      <div className="adm-confirm-box" onClick={e => e.stopPropagation()} role="alertdialog">
        <h3>{title ?? 'Delete this item?'}</h3>
        <p>{message ?? 'This action cannot be undone.'}</p>
        <div className="adm-confirm-btns">
          <button className="adm-btn adm-btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="adm-btn-del" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}
