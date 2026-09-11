// Prepaid plans CRUD — create/edit/delete carrier plans with name, price (optional —
// "Call for Quote" if blank), data amount, features, image, and display order.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import AdminModal from './AdminModal'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

const blank = () => ({
  carrier_name: '',
  plan_name: '',
  price: '',
  data_amount: '',
  features: '',
  display_order: '0',
  imageUrl: '',
  imageFile: null,
})

export default function PlansManager() {
  const [plans, setPlans] = useState([])
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

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('plans')
      .select('*')
      .order('display_order', { ascending: true })
    if (data) setPlans(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  function openAdd() {
    setForm(blank())
    setPreview(null)
    setEditing(null)
    setFormError(null)
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(plan) {
    setForm({
      carrier_name: plan.carrier_name ?? '',
      plan_name: plan.plan_name ?? '',
      price: plan.price != null ? String(plan.price) : '',
      data_amount: plan.data_amount ?? '',
      features: plan.features ?? '',
      display_order: plan.display_order != null ? String(plan.display_order) : '0',
      imageUrl: plan.image_url ?? '',
      imageFile: null,
    })
    setPreview(null)
    setEditing(plan)
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
    if (!form.carrier_name.trim()) errs.carrier_name = 'Carrier name is required.'
    if (!form.plan_name.trim()) errs.plan_name = 'Plan name is required.'
    if (form.price && isNaN(Number(form.price))) errs.price = 'Must be a valid number.'
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
      let imageUrl = form.imageUrl
      if (form.imageFile) {
        const ext = form.imageFile.name.split('.').pop()
        const path = `plans/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('images').upload(path, form.imageFile)
        if (upErr) throw upErr
        imageUrl = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
      }

      const payload = {
        carrier_name: form.carrier_name.trim(),
        plan_name: form.plan_name.trim(),
        price: form.price ? Number(form.price) : null,
        data_amount: form.data_amount.trim() || null,
        features: form.features.trim() || null,
        display_order: form.display_order ? Number(form.display_order) : 0,
        image_url: imageUrl || null,
      }

      const { error } = editing
        ? await supabase.from('plans').update(payload).eq('id', editing.id)
        : await supabase.from('plans').insert(payload)

      if (error) throw error

      setModalOpen(false)
      await fetchPlans()
      showToast(editing ? 'Plan updated successfully.' : 'Plan added successfully.')
    } catch (err) {
      setFormError(err.message ?? 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const { error } = await supabase.from('plans').delete().eq('id', confirmId)
    setConfirmId(null)
    if (error) {
      showToast('Delete failed: ' + error.message, 'error')
    } else {
      await fetchPlans()
      showToast('Plan deleted.')
    }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div>
      <div className="adm-manager-bar">
        <div>
          <h1>Plans</h1>
          <p>{plans.length} plan{plans.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Plan
        </button>
      </div>

      <div className="adm-table-card">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" />Loading plans…</div>
        ) : plans.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon">📶</div>
            <div className="adm-empty-title">No plans yet</div>
            <div className="adm-empty-sub">Add your first prepaid plan to display it on the Plans page.</div>
          </div>
        ) : (
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Carrier</th>
                  <th>Plan</th>
                  <th>Data</th>
                  <th>Price</th>
                  <th>Order</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id}>
                    <td>
                      {plan.image_url
                        ? <img className="adm-thumb" src={plan.image_url} alt={plan.carrier_name} />
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
                      <div className="adm-item-name">{plan.carrier_name}</div>
                    </td>
                    <td>
                      <div className="adm-item-name">{plan.plan_name}</div>
                      {plan.features && <div className="adm-item-sub">{plan.features}</div>}
                    </td>
                    <td>
                      <span className="adm-badge adm-badge-gray">{plan.data_amount || '—'}</span>
                    </td>
                    <td>
                      {plan.price != null ? `$${Number(plan.price).toFixed(2)}` : '—'}
                    </td>
                    <td>{plan.display_order}</td>
                    <td>
                      <div className="adm-actions">
                        <button className="adm-btn adm-btn-ghost" onClick={() => openEdit(plan)}>Edit</button>
                        <button className="adm-btn adm-btn-danger-ghost" onClick={() => setConfirmId(plan.id)}>Delete</button>
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
        title={editing ? 'Edit Plan' : 'Add New Plan'}
        footer={
          <>
            <button className="adm-btn adm-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="adm-btn adm-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Plan'}
            </button>
          </>
        }
      >
        <form className="adm-form" onSubmit={handleSubmit} noValidate>
          {formError && <div className="adm-form-err">⚠ {formError}</div>}

          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="pl-carrier">Carrier Name <span className="req">*</span></label>
              <input
                id="pl-carrier"
                className={`adm-input${errors.carrier_name ? ' err' : ''}`}
                value={form.carrier_name}
                onChange={e => set('carrier_name', e.target.value)}
                placeholder="e.g. Boost Mobile"
              />
              {errors.carrier_name && <span className="adm-field-err">{errors.carrier_name}</span>}
            </div>
            <div className="adm-field">
              <label htmlFor="pl-plan">Plan Name <span className="req">*</span></label>
              <input
                id="pl-plan"
                className={`adm-input${errors.plan_name ? ' err' : ''}`}
                value={form.plan_name}
                onChange={e => set('plan_name', e.target.value)}
                placeholder="e.g. Unlimited Talk & Text"
              />
              {errors.plan_name && <span className="adm-field-err">{errors.plan_name}</span>}
            </div>
          </div>

          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="pl-price">Price ($)</label>
              <input
                id="pl-price"
                type="number"
                step="0.01"
                min="0"
                className={`adm-input${errors.price ? ' err' : ''}`}
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="Leave blank for Call for Quote"
              />
              {errors.price && <span className="adm-field-err">{errors.price}</span>}
            </div>
            <div className="adm-field">
              <label htmlFor="pl-data">Data Amount</label>
              <input
                id="pl-data"
                className="adm-input"
                value={form.data_amount}
                onChange={e => set('data_amount', e.target.value)}
                placeholder="e.g. Unlimited or 5GB"
              />
            </div>
          </div>

          <div className="adm-field">
            <label htmlFor="pl-features">Features</label>
            <textarea
              id="pl-features"
              className="adm-textarea"
              value={form.features}
              onChange={e => set('features', e.target.value)}
              placeholder="Short description of what's included…"
            />
          </div>

          <div className="adm-field">
            <label htmlFor="pl-order">Display Order</label>
            <input
              id="pl-order"
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
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!confirmId}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete this plan?"
        message="This will permanently remove the plan from the Plans page. This action cannot be undone."
      />

      <Toast toast={toast} />
    </div>
  )
}
