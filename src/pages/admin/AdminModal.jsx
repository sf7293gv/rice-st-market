export default function AdminModal({ open, onClose, title, children, footer }) {
  if (!open) return null

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="adm-modal-hd">
          <h2>{title}</h2>
          <button className="adm-modal-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="adm-modal-bd">{children}</div>
        {footer && <div className="adm-modal-ft">{footer}</div>}
      </div>
    </div>
  )
}
