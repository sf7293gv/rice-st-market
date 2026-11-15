// Page photos CRUD — store photos (shelves, aisles) shown in a page's photo gallery, e.g.
// "Inside Our Store" on /grocery. Pick a page, upload photos with an optional caption, edit
// captions, reorder with the arrows (display_order), and delete (also removes the stored file).
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { PHOTO_PAGES, PAGE_PHOTOS_BUCKET, PAGE_PHOTOS_FOLDER } from '../../lib/pagePhotos'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

export default function PagePhotosManager() {
  const [page, setPage] = useState(PHOTO_PAGES[0].value)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editCaption, setEditCaption] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [toast, setToast] = useState(null)

  const pageLabel = PHOTO_PAGES.find(p => p.value === page)?.label ?? page

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // State is only set after the query resolves, so loading on mount doesn't
  // trigger react-hooks/set-state-in-effect.
  const fetchPhotos = useCallback(() =>
    supabase
      .from('page_photos')
      .select('*')
      .eq('page', page)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) showToast('Could not load photos: ' + error.message, 'error')
        if (data) setPhotos(data)
        setLoading(false)
      })
  , [page])

  useEffect(() => { fetchPhotos() }, [fetchPhotos])

  function changePage(next) {
    setPage(next)
    setLoading(true)
    setPhotos([])
    setEditingId(null)
  }

  function handleFileChange(e) {
    const f = e.target.files[0]
    setFile(f || null)
    setUploadError(null)
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) { setUploadError('Please choose a photo.'); return }
    if (!file.type.startsWith('image/')) { setUploadError('That file is not an image.'); return }
    setUploading(true)
    setUploadError(null)

    try {
      const ext = file.name.split('.').pop()
      const path = `${PAGE_PHOTOS_FOLDER}/${page}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from(PAGE_PHOTOS_BUCKET).upload(path, file)
      if (upErr) throw upErr
      const imageUrl = supabase.storage.from(PAGE_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl

      // New photos go to the end of the current order.
      const nextOrder = photos.length ? Math.max(...photos.map(p => p.display_order ?? 0)) + 1 : 0
      const { error: dbErr } = await supabase.from('page_photos').insert({
        page,
        image_url: imageUrl,
        caption: caption.trim() || null,
        display_order: nextOrder,
      })
      if (dbErr) throw dbErr

      setFile(null)
      setCaption('')
      const input = document.getElementById('pp-file')
      if (input) input.value = ''
      await fetchPhotos()
      showToast('Photo uploaded.')
    } catch (err) {
      setUploadError(err.message ?? 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function startEdit(photo) {
    setEditingId(photo.id)
    setEditCaption(photo.caption ?? '')
  }

  async function saveCaption(photo) {
    setBusyId(photo.id)
    const { error } = await supabase.from('page_photos').update({ caption: editCaption.trim() || null }).eq('id', photo.id)
    setBusyId(null)
    if (error) { showToast('Save failed: ' + error.message, 'error'); return }
    setEditingId(null)
    await fetchPhotos()
    showToast('Caption saved.')
  }

  // Swap a photo with its neighbour, then renumber the whole list 0..n-1 so orders stay unique.
  async function move(index, direction) {
    const target = index + direction
    if (target < 0 || target >= photos.length) return
    const reordered = [...photos]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setPhotos(reordered)
    setBusyId(photos[index].id)
    const results = await Promise.all(
      reordered.map((p, i) => p.display_order === i
        ? { error: null }
        : supabase.from('page_photos').update({ display_order: i }).eq('id', p.id))
    )
    setBusyId(null)
    const failed = results.find(r => r.error)
    if (failed) showToast('Reorder failed: ' + failed.error.message, 'error')
    await fetchPhotos()
  }

  async function handleDelete() {
    const photo = photos.find(p => p.id === confirmId)
    setConfirmId(null)
    if (!photo) return

    const urlParts = photo.image_url.split(`/object/public/${PAGE_PHOTOS_BUCKET}/`)
    if (urlParts.length === 2) {
      await supabase.storage.from(PAGE_PHOTOS_BUCKET).remove([decodeURIComponent(urlParts[1])])
    }

    const { error } = await supabase.from('page_photos').delete().eq('id', photo.id)
    if (error) {
      showToast('Delete failed: ' + error.message, 'error')
    } else {
      await fetchPhotos()
      showToast('Photo deleted.')
    }
  }

  return (
    <div>
      <div className="adm-manager-bar">
        <div>
          <h1>Page Photos</h1>
          <p>Store photos (shelves, aisles) shown in a page's photo gallery.</p>
        </div>
        <div className="adm-field" style={{ minWidth: '180px' }}>
          <label htmlFor="pp-page">Page</label>
          <select id="pp-page" className="adm-select" value={page} onChange={e => changePage(e.target.value)}>
            {PHOTO_PAGES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Upload form */}
      <div className="adm-table-card" style={{ marginBottom: '24px' }}>
        <form className="adm-form" onSubmit={handleUpload} noValidate style={{ maxWidth: '560px' }}>
          <h2 style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: '16px', color: 'var(--adm-text)' }}>
            Add a photo to {pageLabel}
          </h2>

          {uploadError && (
            <div className="adm-form-err" style={{ marginBottom: '12px' }}>⚠ {uploadError}</div>
          )}

          <div className="adm-field">
            <label>Photo</label>
            <label className="adm-file-label" style={{ display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {file ? file.name : 'Choose photo'}
              <input id="pp-file" type="file" accept="image/*" onChange={handleFileChange} />
            </label>
          </div>

          <div className="adm-field">
            <label htmlFor="pp-caption">Caption (optional — also used as the image description for search engines and screen readers)</label>
            <input
              id="pp-caption"
              className="adm-input"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="e.g. Fresh produce aisle"
            />
          </div>

          <button className="adm-btn adm-btn-primary" type="submit" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </div>

      {/* Photo list */}
      <div className="adm-table-card">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" />Loading photos…</div>
        ) : photos.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon">🖼️</div>
            <div className="adm-empty-title">No photos for {pageLabel} yet</div>
            <div className="adm-empty-sub">Upload a photo above. The gallery stays hidden on the page until it has at least one photo.</div>
          </div>
        ) : (
          <div className="adm-media-grid">
            {photos.map((photo, i) => (
              <div key={photo.id} className="adm-media-card">
                <div className="adm-media-preview">
                  <img src={photo.image_url} alt={photo.caption || `${pageLabel} photo`} />
                  <span className="adm-media-type-badge">#{i + 1}</span>
                </div>

                {editingId === photo.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 10px 0' }}>
                    <input
                      className="adm-input"
                      value={editCaption}
                      onChange={e => setEditCaption(e.target.value)}
                      placeholder="Caption"
                      aria-label="Caption"
                      autoFocus
                    />
                    <div className="adm-actions">
                      <button className="adm-btn adm-btn-primary" onClick={() => saveCaption(photo)} disabled={busyId === photo.id}>Save</button>
                      <button className="adm-btn adm-btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="adm-media-desc">{photo.caption || <em style={{ opacity: 0.6 }}>No caption</em>}</p>
                )}

                <div className="adm-actions" style={{ padding: '8px 10px 10px', flexWrap: 'wrap' }}>
                  <button className="adm-btn adm-btn-ghost" onClick={() => move(i, -1)} disabled={i === 0 || busyId !== null} aria-label="Move earlier">↑</button>
                  <button className="adm-btn adm-btn-ghost" onClick={() => move(i, 1)} disabled={i === photos.length - 1 || busyId !== null} aria-label="Move later">↓</button>
                  {editingId !== photo.id && (
                    <button className="adm-btn adm-btn-ghost" onClick={() => startEdit(photo)}>Edit caption</button>
                  )}
                  <button className="adm-btn adm-btn-danger-ghost" onClick={() => setConfirmId(photo.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete this photo?"
        message={`This removes the photo from the ${pageLabel} page and deletes the stored file. This action cannot be undone.`}
      />

      <Toast toast={toast} />
    </div>
  )
}
