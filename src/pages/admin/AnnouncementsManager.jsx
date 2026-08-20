// Announcements CRUD — create/edit/delete site-wide announcements shown on the Home page.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { STORE_NAME_SHORT } from '../../lib/siteConfig'
import AdminModal from './AdminModal'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

const blank = () => ({ message: '', active: true })

export default function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank())
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [toast, setToast] = useState(null)
  const [msgError, setMsgError] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setAnnouncements(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  function openAdd() {
    setForm(blank())
    setEditing(null)
    setFormError(null)
    setMsgError(null)
    setModalOpen(true)
  }

  function openEdit(ann) {
    setForm({ message: ann.message ?? '', active: ann.active ?? true })
    setEditing(ann)
    setFormError(null)
    setMsgError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.message.trim()) { setMsgError('Message is required.'); return }
    setSaving(true)
    setFormError(null)
    setMsgError(null)

    try {
      const payload = { message: form.message.trim(), active: form.active }
      const { error } = editing
        ? await supabase.from('announcements').update(payload).eq('id', editing.id)
        : await supabase.from('announcements').insert(payload)

      if (error) throw error

      setModalOpen(false)
      await fetchAnnouncements()
      showToast(editing ? 'Announcement updated.' : 'Announcement posted.')
    } catch (err) {
      setFormError(err.message ?? 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const { error } = await supabase.from('announcements').delete().eq('id', confirmId)
    setConfirmId(null)
    if (error) {
      showToast('Delete failed: ' + error.message, 'error')
    } else {
      await fetchAnnouncements()
      showToast('Announcement deleted.')
    }
  }

  function formatDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      <div className="adm-manager-bar">
        <div>
          <h1>Announcements</h1>
          <p>{announcements.length} announcement{announcements.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Announcement
        </button>
      </div>

      <div className="adm-table-card">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" />Loading announcements…</div>
        ) : announcements.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon">📢</div>
            <div className="adm-empty-title">No announcements yet</div>
            <div className="adm-empty-sub">Post an announcement to display it on the home page.</div>
          </div>
        ) : (
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Posted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {announcements.map(ann => (
                  <tr key={ann.id}>
                    <td style={{ maxWidth: '460px' }}>
                      <div style={{ fontWeight: 500, lineHeight: 1.5, whiteSpace: 'normal', fontSize: '0.875rem' }}>
                        {ann.message}
                      </div>
                    </td>
                    <td>
                      {ann.active
                        ? <span className="adm-badge adm-badge-green">Live</span>
                        : <span className="adm-badge adm-badge-gray">Hidden</span>
                      }
                    </td>
                    <td style={{ color: '#9ca3af', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {formatDate(ann.created_at)}
                    </td>
                    <td>
                      <div className="adm-actions">
                        <button className="adm-btn adm-btn-ghost" onClick={() => openEdit(ann)}>Edit</button>
                        <button className="adm-btn adm-btn-danger-ghost" onClick={() => setConfirmId(ann.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form modal */}
      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Announcement' : 'New Announcement'}
        footer={
          <>
            <button className="adm-btn adm-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="adm-btn adm-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Post Announcement'}
            </button>
          </>
        }
      >
        <form className="adm-form" onSubmit={handleSubmit} noValidate>
          {formError && <div className="adm-form-err">⚠ {formError}</div>}

          <div className="adm-field">
            <label htmlFor="a-msg">Message <span className="req">*</span></label>
            <textarea
              id="a-msg"
              className={`adm-textarea${msgError ? ' err' : ''}`}
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder={`e.g. We will be closed on Thanksgiving Day. Happy holidays from the ${STORE_NAME_SHORT} family!`}
              style={{ minHeight: '110px' }}
            />
            {msgError && <span className="adm-field-err">{msgError}</span>}
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              This message will appear as a banner on the home page when active.
            </span>
          </div>

          <div className="adm-toggle-row">
            <div className="adm-toggle-text">
              <strong>Live</strong>
              <span>Show this announcement on the website now</span>
            </div>
            <label className="adm-switch">
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              />
              <span className="adm-switch-track" />
            </label>
          </div>
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!confirmId}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete this announcement?"
        message="This will permanently remove the announcement. It will no longer appear on the website."
      />

      <Toast toast={toast} />
    </div>
  )
}
