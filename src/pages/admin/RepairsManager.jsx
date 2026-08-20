// Repair services CRUD — create/edit/delete services with name, optional price, description, and active toggle.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import AdminModal from './AdminModal'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

const blank = () => ({
  name: '',
  price: '',
  description: '',
  imageUrl: '',
  imageFile: null,
  active: true,
})

export default function RepairsManager() {
  const [services, setServices] = useState([])
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

  const fetchServices = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('repair_services').select('*').order('created_at')
    if (data) setServices(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchServices() }, [fetchServices])

  function openAdd() {
    setForm(blank())
    setPreview(null)
    setEditing(null)
    setFormError(null)
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(svc) {
    setForm({
      name: svc.name ?? '',
      price: svc.price != null ? String(svc.price) : '',
      description: svc.description ?? '',
      imageUrl: svc.image_url ?? '',
      imageFile: null,
      active: svc.active ?? true,
    })
    setPreview(null)
    setEditing(svc)
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
    if (!form.name.trim()) errs.name = 'Name is required.'
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
        const path = `repairs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('images').upload(path, form.imageFile)
        if (upErr) throw upErr
        imageUrl = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
      }

      const payload = {
        name: form.name.trim(),
        price: form.price.trim() || null,
        description: form.description.trim() || null,
        image_url: imageUrl || null,
        active: form.active,
      }

      const { error } = editing
        ? await supabase.from('repair_services').update(payload).eq('id', editing.id)
        : await supabase.from('repair_services').insert(payload)

      if (error) throw error

      setModalOpen(false)
      await fetchServices()
      showToast(editing ? 'Service updated successfully.' : 'Service added successfully.')
    } catch (err) {
      setFormError(err.message ?? 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const { error } = await supabase.from('repair_services').delete().eq('id', confirmId)
    setConfirmId(null)
    if (error) {
      showToast('Delete failed: ' + error.message, 'error')
    } else {
      await fetchServices()
      showToast('Service deleted.')
    }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div>
      <div className="adm-manager-bar">
        <div>
          <h1>Repair Services</h1>
          <p>{services.length} service{services.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Service
        </button>
      </div>

      <div className="adm-table-card">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" />Loading services…</div>
        ) : services.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon">🔧</div>
            <div className="adm-empty-title">No repair services yet</div>
            <div className="adm-empty-sub">Add your first repair service to display it on the Repairs page.</div>
          </div>
        ) : (
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {services.map(svc => (
                  <tr key={svc.id}>
                    <td>
                      {svc.image_url
                        ? <img className="adm-thumb" src={svc.image_url} alt={svc.name} />
                        : <div className="adm-thumb-empty">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                      }
                    </td>
                    <td>
                      <div className="adm-item-name">{svc.name}</div>
                      {svc.description && <div className="adm-item-sub">{svc.description}</div>}
                    </td>
                    <td>{svc.price || '—'}</td>
                    <td>
                      {svc.active
                        ? <span className="adm-badge adm-badge-green">Active</span>
                        : <span className="adm-badge adm-badge-gray">Hidden</span>
                      }
                    </td>
                    <td>
                      <div className="adm-actions">
                        <button className="adm-btn adm-btn-ghost" onClick={() => openEdit(svc)}>Edit</button>
                        <button className="adm-btn adm-btn-danger-ghost" onClick={() => setConfirmId(svc.id)}>Delete</button>
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
        title={editing ? 'Edit Repair Service' : 'Add Repair Service'}
        footer={
          <>
            <button className="adm-btn adm-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="adm-btn adm-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Service'}
            </button>
          </>
        }
      >
        <form className="adm-form" onSubmit={handleSubmit} noValidate>
          {formError && <div className="adm-form-err">⚠ {formError}</div>}

          <div className="adm-field">
            <label htmlFor="rs-name">Name <span className="req">*</span></label>
            <input
              id="rs-name"
              className={`adm-input${errors.name ? ' err' : ''}`}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Screen Replacement"
            />
            {errors.name && <span className="adm-field-err">{errors.name}</span>}
          </div>

          <div className="adm-field">
            <label htmlFor="rs-price">Price</label>
            <input
              id="rs-price"
              className="adm-input"
              value={form.price}
              onChange={e => set('price', e.target.value)}
              placeholder="e.g. From $49, $79–$149, Call for quote"
            />
          </div>

          <div className="adm-field">
            <label htmlFor="rs-desc">Description</label>
            <textarea
              id="rs-desc"
              className="adm-textarea"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Brief description of the repair service…"
            />
          </div>

          <div className="adm-field">
            <label>Image</label>
            <div className="adm-img-upload">
              <div className="adm-img-preview">
                {(preview || form.imageUrl)
                  ? <img src={preview || form.imageUrl} alt="Preview" />
                  : <div className="adm-img-preview-empty">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span>No image</span>
                    </div>
                }
              </div>
              <label className="adm-file-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
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
              <span>Show this service on the Repairs page</span>
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
        title="Delete this service?"
        message="This will permanently remove the repair service. This action cannot be undone."
      />

      <Toast toast={toast} />
    </div>
  )
}
