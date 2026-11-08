// Repair videos CRUD — TikTok videos shown in the Repairs page's "Watch Our Repairs" section.
// URLs are validated and stored in canonical form (see lib/tiktok.js); short links are rejected.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { parseTikTokUrl } from '../../lib/tiktok'
import AdminModal from './AdminModal'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

const blank = () => ({
  tiktok_url: '',
  title: '',
  display_order: '0',
})

export default function RepairVideosManager() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank())
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [toast, setToast] = useState(null)
  const [errors, setErrors] = useState({})

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // State is only set after the query resolves, so the initial load doesn't
  // trigger react-hooks/set-state-in-effect.
  const fetchVideos = useCallback(() =>
    supabase
      .from('repair_videos')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setVideos(data)
        setLoading(false)
      })
  , [])

  useEffect(() => { fetchVideos() }, [fetchVideos])

  function openAdd() {
    setForm(blank())
    setEditing(null)
    setFormError(null)
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(video) {
    setForm({
      tiktok_url: video.tiktok_url ?? '',
      title: video.title ?? '',
      display_order: video.display_order != null ? String(video.display_order) : '0',
    })
    setEditing(video)
    setFormError(null)
    setErrors({})
    setModalOpen(true)
  }

  function validate() {
    const errs = {}
    if (!form.tiktok_url.trim()) errs.tiktok_url = 'TikTok video address is required.'
    else {
      const parsed = parseTikTokUrl(form.tiktok_url)
      if (parsed.error) errs.tiktok_url = parsed.error
    }
    if (form.display_order && !Number.isInteger(Number(form.display_order))) errs.display_order = 'Must be a whole number.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    setFormError(null)

    try {
      const payload = {
        tiktok_url: parseTikTokUrl(form.tiktok_url).url,
        title: form.title.trim() || null,
        display_order: form.display_order ? Number(form.display_order) : 0,
      }

      const { error } = editing
        ? await supabase.from('repair_videos').update(payload).eq('id', editing.id)
        : await supabase.from('repair_videos').insert(payload)

      if (error) throw error

      setModalOpen(false)
      await fetchVideos()
      showToast(editing ? 'Video updated successfully.' : 'Video added successfully.')
    } catch (err) {
      setFormError(err.message ?? 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const { error } = await supabase.from('repair_videos').delete().eq('id', confirmId)
    setConfirmId(null)
    if (error) {
      showToast('Delete failed: ' + error.message, 'error')
    } else {
      await fetchVideos()
      showToast('Video deleted.')
    }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div>
      <div className="adm-manager-bar">
        <div>
          <h1>Repair Videos</h1>
          <p>{videos.length} video{videos.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Video
        </button>
      </div>

      <div className="adm-table-card">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" />Loading videos…</div>
        ) : videos.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon">🎬</div>
            <div className="adm-empty-title">No videos yet</div>
            <div className="adm-empty-sub">Add a TikTok video to show it in the "Watch Our Repairs" section of the Repairs page.</div>
          </div>
        ) : (
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Video</th>
                  <th>Order</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {videos.map(video => (
                  <tr key={video.id}>
                    <td>
                      <div className="adm-item-name">{video.title || 'Untitled video'}</div>
                      <div className="adm-item-sub">
                        <a href={video.tiktok_url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
                          {video.tiktok_url}
                        </a>
                      </div>
                    </td>
                    <td>{video.display_order}</td>
                    <td>
                      <div className="adm-actions">
                        <button className="adm-btn adm-btn-ghost" onClick={() => openEdit(video)}>Edit</button>
                        <button className="adm-btn adm-btn-danger-ghost" onClick={() => setConfirmId(video.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Video' : 'Add New Video'}
        footer={
          <>
            <button className="adm-btn adm-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="adm-btn adm-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Video'}
            </button>
          </>
        }
      >
        <form className="adm-form" onSubmit={handleSubmit} noValidate>
          {formError && <div className="adm-form-err">⚠ {formError}</div>}

          <div className="adm-field">
            <label htmlFor="rv-url">TikTok Video Address <span className="req">*</span></label>
            <input
              id="rv-url"
              type="url"
              inputMode="url"
              className={`adm-input${errors.tiktok_url ? ' err' : ''}`}
              value={form.tiktok_url}
              onChange={e => set('tiktok_url', e.target.value)}
              placeholder="https://www.tiktok.com/@techbanzo/video/1234567890"
            />
            {errors.tiktok_url && <span className="adm-field-err">{errors.tiktok_url}</span>}
            <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
              Open the video on tiktok.com and copy the address from the browser. Short share links (vm.tiktok.com) won't work.
            </span>
          </div>

          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="rv-title">Title</label>
              <input
                id="rv-title"
                className="adm-input"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. iPhone 13 screen replacement"
              />
            </div>
            <div className="adm-field">
              <label htmlFor="rv-order">Display Order</label>
              <input
                id="rv-order"
                type="number"
                step="1"
                className={`adm-input${errors.display_order ? ' err' : ''}`}
                value={form.display_order}
                onChange={e => set('display_order', e.target.value)}
                placeholder="0"
              />
              {errors.display_order && <span className="adm-field-err">{errors.display_order}</span>}
              <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>Lower numbers show first on the Repairs page.</span>
            </div>
          </div>
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!confirmId}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete this video?"
        message="This will remove the video from the Repairs page. The video stays on TikTok. This action cannot be undone."
      />

      <Toast toast={toast} />
    </div>
  )
}
