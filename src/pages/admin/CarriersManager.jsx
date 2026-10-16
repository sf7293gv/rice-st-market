// Carriers CRUD — create/edit/delete the carriers shown in the Plans page's
// "Carriers We Carry" section, with name, optional logo, and display order.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import AdminModal from './AdminModal'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

const blank = () => ({
  name: '',
  display_order: '0',
  logoUrl: '',
  logoFile: null,
})

export default function CarriersManager() {
  const [carriers, setCarriers] = useState([])
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

  // State is only set after the query resolves, so the initial load doesn't
  // trigger react-hooks/set-state-in-effect.
  const fetchCarriers = useCallback(() =>
    supabase
      .from('carriers')
      .select('*')
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data) setCarriers(data)
        setLoading(false)
      })
  , [])

  useEffect(() => { fetchCarriers() }, [fetchCarriers])

  function openAdd() {
    setForm(blank())
    setPreview(null)
    setEditing(null)
    setFormError(null)
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(carrier) {
    setForm({
      name: carrier.name ?? '',
      display_order: carrier.display_order != null ? String(carrier.display_order) : '0',
      logoUrl: carrier.logo_url ?? '',
      logoFile: null,
    })
    setPreview(null)
    setEditing(carrier)
    setFormError(null)
    setErrors({})
    setModalOpen(true)
  }

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setForm(f => ({ ...f, logoFile: file }))
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Carrier name is required.'
    if (form.display_order && isNaN(Number(form.display_order))) errs.display_order = 'Must be a whole number.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    setFormError(null)

    try {
      let logoUrl = form.logoUrl
      if (form.logoFile) {
        const ext = form.logoFile.name.split('.').pop()
        const path = `carriers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('images').upload(path, form.logoFile)
        if (upErr) throw upErr
        logoUrl = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
      }

      const payload = {
        name: form.name.trim(),
        display_order: form.display_order ? Number(form.display_order) : 0,
        logo_url: logoUrl || null,
      }

      const { error } = editing
        ? await supabase.from('carriers').update(payload).eq('id', editing.id)
        : await supabase.from('carriers').insert(payload)

      if (error) throw error

      setModalOpen(false)
      await fetchCarriers()
      showToast(editing ? 'Carrier updated successfully.' : 'Carrier added successfully.')
    } catch (err) {
      setFormError(err.message ?? 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const { error } = await supabase.from('carriers').delete().eq('id', confirmId)
    setConfirmId(null)
    if (error) {
      showToast('Delete failed: ' + error.message, 'error')
    } else {
      await fetchCarriers()
      showToast('Carrier deleted.')
    }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div>
      <div className="adm-manager-bar">
        <div>
          <h1>Carriers</h1>
          <p>{carriers.length} carrier{carriers.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Carrier
        </button>
      </div>

      <div className="adm-table-card">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" />Loading carriers…</div>
        ) : carriers.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon">📡</div>
            <div className="adm-empty-title">No carriers yet</div>
            <div className="adm-empty-sub">Add a carrier to show it in the "Carriers We Carry" section of the Plans page.</div>
          </div>
        ) : (
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Logo</th>
                  <th>Carrier</th>
                  <th>Order</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {carriers.map(carrier => (
                  <tr key={carrier.id}>
                    <td>
                      {carrier.logo_url
                        ? <img className="adm-thumb" src={carrier.logo_url} alt={carrier.name} style={{ objectFit: 'contain', background: '#fff' }} />
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
                      <div className="adm-item-name">{carrier.name}</div>
                    </td>
                    <td>{carrier.display_order}</td>
                    <td>
                      <div className="adm-actions">
                        <button className="adm-btn adm-btn-ghost" onClick={() => openEdit(carrier)}>Edit</button>
                        <button className="adm-btn adm-btn-danger-ghost" onClick={() => setConfirmId(carrier.id)}>Delete</button>
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
        title={editing ? 'Edit Carrier' : 'Add New Carrier'}
        footer={
          <>
            <button className="adm-btn adm-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="adm-btn adm-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Carrier'}
            </button>
          </>
        }
      >
        <form className="adm-form" onSubmit={handleSubmit} noValidate>
          {formError && <div className="adm-form-err">⚠ {formError}</div>}

          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="cr-name">Carrier Name <span className="req">*</span></label>
              <input
                id="cr-name"
                className={`adm-input${errors.name ? ' err' : ''}`}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Boost Mobile"
              />
              {errors.name && <span className="adm-field-err">{errors.name}</span>}
            </div>
            <div className="adm-field">
              <label htmlFor="cr-order">Display Order</label>
              <input
                id="cr-order"
                type="number"
                step="1"
                className={`adm-input${errors.display_order ? ' err' : ''}`}
                value={form.display_order}
                onChange={e => set('display_order', e.target.value)}
                placeholder="0"
              />
              {errors.display_order && <span className="adm-field-err">{errors.display_order}</span>}
              <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>Lower numbers show first on the Plans page.</span>
            </div>
          </div>

          <div className="adm-field">
            <label>Logo</label>
            <div className="adm-img-upload">
              <div className="adm-img-preview">
                {(preview || form.logoUrl)
                  ? <img src={preview || form.logoUrl} alt="Preview" style={{ objectFit: 'contain', background: '#fff' }} />
                  : <div className="adm-img-preview-empty">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span>No logo</span>
                    </div>
                }
              </div>
              <label className="adm-file-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {form.logoFile ? form.logoFile.name : 'Choose logo'}
                <input type="file" accept="image/*" onChange={handleLogoChange} />
              </label>
              {(preview || form.logoUrl) && (
                <button
                  type="button"
                  className="adm-btn adm-btn-ghost"
                  style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                  onClick={() => { setPreview(null); set('logoUrl', ''); set('logoFile', null) }}
                >
                  Remove logo
                </button>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>Without a logo, the carrier's name is shown as a styled tile.</span>
          </div>
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!confirmId}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete this carrier?"
        message="This will remove the carrier from the Plans page. Plans that mention this carrier are not affected. This action cannot be undone."
      />

      <Toast toast={toast} />
    </div>
  )
}
