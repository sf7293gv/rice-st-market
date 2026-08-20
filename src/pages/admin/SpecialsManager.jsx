// Weekly specials CRUD — create/edit/delete specials with title, sale price, original price, image, and active toggle.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import AdminModal from './AdminModal'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

const blank = () => ({
  title: '',
  description: '',
  original_price: '',
  sale_price: '',
  imageUrl: '',
  imageFile: null,
  active: true,
})

export default function SpecialsManager() {
  const [specials, setSpecials] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank())
  const [preview, setPreview] = useState(null)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [toast, setToast] = useState(null)
  const [errors, setErrors] = useState({})

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchSpecials = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('specials').select('*').order('created_at', { ascending: false })
    if (data) setSpecials(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchSpecials() }, [fetchSpecials])

  function openAdd() {
    setForm(blank())
    setPreview(null)
    setEditing(null)
    setFormError(null)
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(special) {
    setForm({
      title: special.title ?? '',
      description: special.description ?? '',
      original_price: special.original_price != null ? String(special.original_price) : '',
      sale_price: special.sale_price != null ? String(special.sale_price) : '',
      imageUrl: special.image_url ?? '',
      imageFile: null,
      active: special.active ?? true,
    })
    setPreview(null)
    setEditing(special)
    setFormError(null)
    setErrors({})
    setModalOpen(true)
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setForm(f => ({ ...f, imageFile: file }))
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function validate() {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required.'
    if (!form.sale_price) errs.sale_price = 'Sale price is required.'
    else if (isNaN(Number(form.sale_price))) errs.sale_price = 'Must be a valid number.'
    if (form.original_price && isNaN(Number(form.original_price))) errs.original_price = 'Must be a valid number.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    setFormError(null)

    try {
      let imageUrl = form.imageUrl
      if (form.imageFile) {
        const ext = form.imageFile.name.split('.').pop()
        const path = `specials/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('images').upload(path, form.imageFile)
        if (upErr) throw upErr
        imageUrl = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        original_price: form.original_price ? Number(form.original_price) : null,
        sale_price: Number(form.sale_price),
        image_url: imageUrl || null,
        active: form.active,
      }

      const { error } = editing
        ? await supabase.from('specials').update(payload).eq('id', editing.id)
        : await supabase.from('specials').insert(payload)

      if (error) throw error

      setModalOpen(false)
      await fetchSpecials()
      showToast(editing ? 'Special updated.' : 'Special added.')
    } catch (err) {
      setFormError(err.message ?? 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const { error } = await supabase.from('specials').delete().eq('id', confirmId)
    setConfirmId(null)
    if (error) {
      showToast('Delete failed: ' + error.message, 'error')
    } else {
      await fetchSpecials()
      showToast('Special deleted.')
    }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div>
      <div className="adm-manager-bar">
        <div>
          <h1>Weekly Specials</h1>
          <p>{specials.length} special{specials.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Special
        </button>
      </div>

      <div className="adm-table-card">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" />Loading specials…</div>
        ) : specials.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon">🏷️</div>
            <div className="adm-empty-title">No specials yet</div>
            <div className="adm-empty-sub">Create a weekly special to display on the home page.</div>
          </div>
        ) : (
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Title</th>
                  <th>Sale Price</th>
                  <th>Original Price</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {specials.map(special => (
                  <tr key={special.id}>
                    <td>
                      {special.image_url
                        ? <img className="adm-thumb" src={special.image_url} alt={special.title} />
                        : <div className="adm-thumb-empty"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
                      }
                    </td>
                    <td>
                      <div className="adm-item-name">{special.title}</div>
                      {special.description && <div className="adm-item-sub">{special.description}</div>}
                    </td>
                    <td style={{ fontWeight: 700, color: '#E8841A' }}>
                      ${Number(special.sale_price).toFixed(2)}
                    </td>
                    <td style={{ color: '#9ca3af', textDecoration: 'line-through' }}>
                      {special.original_price != null ? `$${Number(special.original_price).toFixed(2)}` : '—'}
                    </td>
                    <td>
                      {special.active
                        ? <span className="adm-badge adm-badge-green">Active</span>
                        : <span className="adm-badge adm-badge-gray">Inactive</span>
                      }
                    </td>
                    <td>
                      <div className="adm-actions">
                        <button className="adm-btn adm-btn-ghost" onClick={() => openEdit(special)}>Edit</button>
                        <button className="adm-btn adm-btn-danger-ghost" onClick={() => setConfirmId(special.id)}>Delete</button>
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
        title={editing ? 'Edit Special' : 'Add Weekly Special'}
        footer={
          <>
            <button className="adm-btn adm-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="adm-btn adm-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Special'}
            </button>
          </>
        }
      >
        <form className="adm-form" onSubmit={handleSubmit} noValidate>
          {formError && <div className="adm-form-err">⚠ {formError}</div>}

          <div className="adm-field">
            <label htmlFor="s-name">Title <span className="req">*</span></label>
            <input
              id="s-name"
              className={`adm-input${errors.title ? ' err' : ''}`}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. 2 for 1 Fountain Drinks"
            />
            {errors.title && <span className="adm-field-err">{errors.title}</span>}
          </div>

          <div className="adm-field">
            <label htmlFor="s-desc">Description</label>
            <textarea
              id="s-desc"
              className="adm-textarea"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Optional description…"
            />
          </div>

          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="s-sale">Sale Price ($) <span className="req">*</span></label>
              <input
                id="s-sale"
                type="number"
                step="0.01"
                min="0"
                className={`adm-input${errors.sale_price ? ' err' : ''}`}
                value={form.sale_price}
                onChange={e => set('sale_price', e.target.value)}
                placeholder="1.99"
              />
              {errors.sale_price && <span className="adm-field-err">{errors.sale_price}</span>}
            </div>
            <div className="adm-field">
              <label htmlFor="s-orig">Original Price ($)</label>
              <input
                id="s-orig"
                type="number"
                step="0.01"
                min="0"
                className={`adm-input${errors.original_price ? ' err' : ''}`}
                value={form.original_price}
                onChange={e => set('original_price', e.target.value)}
                placeholder="3.99"
              />
              {errors.original_price && <span className="adm-field-err">{errors.original_price}</span>}
            </div>
          </div>

          <div className="adm-field">
            <label>Image</label>
            <div className="adm-img-upload">
              <div className="adm-img-preview">
                {(preview || form.imageUrl)
                  ? <img src={preview || form.imageUrl} alt="Preview" />
                  : <div className="adm-img-preview-empty">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      <span>No image</span>
                    </div>
                }
              </div>
              <label className="adm-file-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                {form.imageFile ? form.imageFile.name : 'Choose image'}
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </label>
              {(preview || form.imageUrl) && (
                <button
                  type="button"
                  className="adm-btn adm-btn-ghost"
                  style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                  onClick={() => { setPreview(null); set('imageUrl', ''); set('imageFile', null) }}
                >
                  Remove image
                </button>
              )}
            </div>
          </div>

          <div className="adm-toggle-row">
            <div className="adm-toggle-text">
              <strong>Active</strong>
              <span>Show this special on the home page</span>
            </div>
            <label className="adm-switch">
              <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
              <span className="adm-switch-track" />
            </label>
          </div>
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!confirmId}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete this special?"
        message="This will permanently remove the special from the home page."
      />

      <Toast toast={toast} />
    </div>
  )
}
