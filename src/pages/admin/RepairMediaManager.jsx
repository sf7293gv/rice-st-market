// Repair media CRUD — upload before/after photos to the images Storage bucket.
// On delete, the storage path is parsed from the public URL so the file is removed from the bucket too.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

export default function RepairMediaManager() {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ type: 'photo', description: '', file: null })
  const [uploadError, setUploadError] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('repair_media')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setMedia(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  function handleFileChange(e) {
    const file = e.target.files[0]
    setForm(f => ({ ...f, file: file || null }))
    setUploadError(null)
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!form.file) { setUploadError('Please select a file.'); return }
    setUploading(true)
    setUploadError(null)

    try {
      const isVideo = form.type === 'video'
      const bucket = isVideo ? 'videos' : 'images'
      const ext = form.file.name.split('.').pop()
      const path = `repairs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, form.file)
      if (upErr) throw upErr

      const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl

      const { error: dbErr } = await supabase.from('repair_media').insert({
        type: form.type,
        url,
        description: form.description.trim() || null,
      })
      if (dbErr) throw dbErr

      setForm(f => ({ ...f, description: '', file: null }))
      const fileInput = document.getElementById('rm-file')
      if (fileInput) fileInput.value = ''

      await fetchMedia()
      showToast('Media uploaded successfully.')
    } catch (err) {
      setUploadError(err.message ?? 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    const item = media.find(m => m.id === confirmId)
    setConfirmId(null)
    if (!item) return

    const bucket = item.type === 'video' ? 'videos' : 'images'
    const urlParts = item.url.split(`/object/public/${bucket}/`)
    if (urlParts.length === 2) {
      await supabase.storage.from(bucket).remove([decodeURIComponent(urlParts[1])])
    }

    const { error } = await supabase.from('repair_media').delete().eq('id', item.id)
    if (error) {
      showToast('Delete failed: ' + error.message, 'error')
    } else {
      await fetchMedia()
      showToast('Media deleted.')
    }
  }

  const accept = form.type === 'video' ? 'video/*' : 'image/*'

  return (
    <div>
      <div className="adm-manager-bar">
        <div>
          <h1>Repair Media</h1>
          <p>Upload photos and videos showcasing your repair work.</p>
        </div>
      </div>

      {/* Upload form */}
      <div className="adm-table-card" style={{ marginBottom: '24px' }}>
        <form className="adm-form" onSubmit={handleUpload} noValidate style={{ maxWidth: '560px' }}>
          <h2 style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: '16px', color: 'var(--adm-text)' }}>
            Upload New Media
          </h2>

          {uploadError && (
            <div className="adm-form-err" style={{ marginBottom: '12px' }}>⚠ {uploadError}</div>
          )}

          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="rm-type">Type</label>
              <select
                id="rm-type"
                className="adm-select"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value, file: null }))}
              >
                <option value="photo">Photo</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div className="adm-field">
              <label>File</label>
              <label className="adm-file-label" style={{ display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {form.file ? form.file.name : `Choose ${form.type}`}
                <input
                  id="rm-file"
                  type="file"
                  accept={accept}
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          <div className="adm-field">
            <label htmlFor="rm-desc">Caption (optional)</label>
            <input
              id="rm-desc"
              className="adm-input"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. iPhone 14 screen replacement — before & after"
            />
          </div>

          <button className="adm-btn adm-btn-primary" type="submit" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </div>

      {/* Media grid */}
      <div className="adm-table-card">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" />Loading media…</div>
        ) : media.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon">🖼️</div>
            <div className="adm-empty-title">No media yet</div>
            <div className="adm-empty-sub">Upload photos and videos to display on the Repairs page.</div>
          </div>
        ) : (
          <div className="adm-media-grid">
            {media.map(item => (
              <div key={item.id} className="adm-media-card">
                <div className="adm-media-preview">
                  {item.type === 'video'
                    ? (
                      <video
                        src={item.url}
                        preload="metadata"
                        muted
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    )
                    : <img src={item.url} alt={item.description || 'Repair media'} />
                  }
                  <span className={`adm-media-type-badge${item.type === 'video' ? ' video' : ''}`}>
                    {item.type}
                  </span>
                </div>
                {item.description && (
                  <p className="adm-media-desc">{item.description}</p>
                )}
                <button
                  className="adm-btn adm-btn-danger-ghost adm-media-delete"
                  onClick={() => setConfirmId(item.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete this media?"
        message="This will permanently remove the file from storage and the database. This action cannot be undone."
      />

      <Toast toast={toast} />
    </div>
  )
}
