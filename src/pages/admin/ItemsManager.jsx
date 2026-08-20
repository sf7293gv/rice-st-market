// Menu items CRUD — create/edit/delete items with name, category, price, description, and image upload.
// Image is uploaded to the images Storage bucket; the public URL is stored in the DB row.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import AdminModal from './AdminModal'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

const CATEGORIES = ['Deli', 'Hot Food', 'Groceries', 'Drinks', 'Snacks']

const blank = () => ({
  name: '',
  description: '',
  price: '',
  category: 'Deli',
  imageUrl: '',
  imageFile: null,
  in_stock: true,
  featured: false,
})

export default function ItemsManager() {
  const [items, setItems] = useState([])
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

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('items').select('*').order('name')
    if (data) setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  function openAdd() {
    setForm(blank())
    setPreview(null)
    setEditing(null)
    setFormError(null)
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(item) {
    setForm({
      name: item.name ?? '',
      description: item.description ?? '',
      price: item.price != null ? String(item.price) : '',
      category: item.category ?? 'Deli',
      imageUrl: item.image_url ?? '',
      imageFile: null,
      in_stock: item.in_stock ?? true,
      featured: item.featured ?? false,
    })
    setPreview(null)
    setEditing(item)
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
    if (form.price && isNaN(Number(form.price))) errs.price = 'Must be a valid number.'
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
        const path = `items/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('images').upload(path, form.imageFile)
        if (upErr) throw upErr
        imageUrl = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: form.price ? Number(form.price) : null,
        category: form.category,
        image_url: imageUrl || null,
        in_stock: form.in_stock,
        featured: form.featured,
      }

      const { error } = editing
        ? await supabase.from('items').update(payload).eq('id', editing.id)
        : await supabase.from('items').insert(payload)

      if (error) throw error

      setModalOpen(false)
      await fetchItems()
      showToast(editing ? 'Item updated successfully.' : 'Item added successfully.')
    } catch (err) {
      setFormError(err.message ?? 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const { error } = await supabase.from('items').delete().eq('id', confirmId)
    setConfirmId(null)
    if (error) {
      showToast('Delete failed: ' + error.message, 'error')
    } else {
      await fetchItems()
      showToast('Item deleted.')
    }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div>
      <div className="adm-manager-bar">
        <div>
          <h1>Menu Items</h1>
          <p>{items.length} item{items.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Item
        </button>
      </div>

      <div className="adm-table-card">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" />Loading items…</div>
        ) : items.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon">🛒</div>
            <div className="adm-empty-title">No items yet</div>
            <div className="adm-empty-sub">Add your first menu item to get started.</div>
          </div>
        ) : (
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>
                      {item.image_url
                        ? <img className="adm-thumb" src={item.image_url} alt={item.name} />
                        : <div className="adm-thumb-empty"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
                      }
                    </td>
                    <td>
                      <div className="adm-item-name">{item.name}</div>
                      {item.description && <div className="adm-item-sub">{item.description}</div>}
                    </td>
                    <td><span className="adm-badge adm-badge-gray">{item.category ?? '—'}</span></td>
                    <td>{item.price != null ? `$${Number(item.price).toFixed(2)}` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {item.in_stock
                          ? <span className="adm-badge adm-badge-green">In Stock</span>
                          : <span className="adm-badge adm-badge-red">Out of Stock</span>
                        }
                        {item.featured && <span className="adm-badge adm-badge-amber">Featured</span>}
                      </div>
                    </td>
                    <td>
                      <div className="adm-actions">
                        <button className="adm-btn adm-btn-ghost" onClick={() => openEdit(item)}>Edit</button>
                        <button className="adm-btn adm-btn-danger-ghost" onClick={() => setConfirmId(item.id)}>Delete</button>
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
        title={editing ? 'Edit Item' : 'Add New Item'}
        footer={
          <>
            <button className="adm-btn adm-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="adm-btn adm-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Item'}
            </button>
          </>
        }
      >
        <form className="adm-form" onSubmit={handleSubmit} noValidate>
          {formError && <div className="adm-form-err">⚠ {formError}</div>}

          <div className="adm-field">
            <label htmlFor="i-name">Name <span className="req">*</span></label>
            <input
              id="i-name"
              className={`adm-input${errors.name ? ' err' : ''}`}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Turkey Club Sandwich"
            />
            {errors.name && <span className="adm-field-err">{errors.name}</span>}
          </div>

          <div className="adm-field">
            <label htmlFor="i-desc">Description</label>
            <textarea
              id="i-desc"
              className="adm-textarea"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Brief description…"
            />
          </div>

          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="i-price">Price ($)</label>
              <input
                id="i-price"
                type="number"
                step="0.01"
                min="0"
                className={`adm-input${errors.price ? ' err' : ''}`}
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="4.99"
              />
              {errors.price && <span className="adm-field-err">{errors.price}</span>}
            </div>
            <div className="adm-field">
              <label htmlFor="i-cat">Category</label>
              <select
                id="i-cat"
                className="adm-select"
                value={form.category}
                onChange={e => set('category', e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
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
              <strong>In Stock</strong>
              <span>Show as available on the menu</span>
            </div>
            <label className="adm-switch">
              <input type="checkbox" checked={form.in_stock} onChange={e => set('in_stock', e.target.checked)} />
              <span className="adm-switch-track" />
            </label>
          </div>

          <div className="adm-toggle-row">
            <div className="adm-toggle-text">
              <strong>Featured</strong>
              <span>Highlight this item on the menu</span>
            </div>
            <label className="adm-switch">
              <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} />
              <span className="adm-switch-track" />
            </label>
          </div>
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!confirmId}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete this item?"
        message="This will permanently remove the item from your menu. This action cannot be undone."
      />

      <Toast toast={toast} />
    </div>
  )
}
