// Electronics products CRUD — create/edit/delete products with name, category, condition,
// optional price ("Call for Quote" if blank), description, image, and active toggle.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import AdminModal from './AdminModal'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

const CATEGORIES = [
  { value: 'phones',      label: 'Phones' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'accessories', label: 'Accessories' },
]

const CONDITIONS = [
  { value: 'new',  label: 'New' },
  { value: 'used', label: 'Used' },
]

const blank = () => ({
  name: '',
  price: '',
  description: '',
  category: 'phones',
  condition: 'new',
  imageUrl: '',
  imageFile: null,
  in_stock: true,
  active: true,
})

export default function ElectronicsManager() {
  const [products, setProducts] = useState([])
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

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setProducts(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  function openAdd() {
    setForm(blank())
    setPreview(null)
    setEditing(null)
    setFormError(null)
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(product) {
    setForm({
      name: product.name ?? '',
      price: product.price != null ? String(product.price) : '',
      description: product.description ?? '',
      category: product.category ?? 'phones',
      condition: product.condition ?? 'new',
      imageUrl: product.image_url ?? '',
      imageFile: null,
      in_stock: product.in_stock ?? true,
      active: product.active ?? true,
    })
    setPreview(null)
    setEditing(product)
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
        const path = `shop/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('images').upload(path, form.imageFile)
        if (upErr) throw upErr
        imageUrl = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
      }

      const payload = {
        name: form.name.trim(),
        price: form.price ? Number(form.price) : null,
        description: form.description.trim() || null,
        category: form.category,
        condition: form.condition,
        image_url: imageUrl || null,
        in_stock: form.in_stock,
        active: form.active,
      }

      const { error } = editing
        ? await supabase.from('products').update(payload).eq('id', editing.id)
        : await supabase.from('products').insert(payload)

      if (error) throw error

      setModalOpen(false)
      await fetchProducts()
      showToast(editing ? 'Product updated successfully.' : 'Product added successfully.')
    } catch (err) {
      setFormError(err.message ?? 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const { error } = await supabase.from('products').delete().eq('id', confirmId)
    setConfirmId(null)
    if (error) {
      showToast('Delete failed: ' + error.message, 'error')
    } else {
      await fetchProducts()
      showToast('Product deleted.')
    }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const categoryLabel = v => CATEGORIES.find(c => c.value === v)?.label ?? v
  const conditionLabel = v => CONDITIONS.find(c => c.value === v)?.label ?? v

  return (
    <div>
      <div className="adm-manager-bar">
        <div>
          <h1>Electronics</h1>
          <p>{products.length} product{products.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Product
        </button>
      </div>

      <div className="adm-table-card">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" />Loading products…</div>
        ) : products.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon">📱</div>
            <div className="adm-empty-title">No products yet</div>
            <div className="adm-empty-sub">Add your first product to display it in Electronics.</div>
          </div>
        ) : (
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Condition</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td>
                      {product.image_url
                        ? <img className="adm-thumb" src={product.image_url} alt={product.name} />
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
                      <div className="adm-item-name">{product.name}</div>
                      {product.description && <div className="adm-item-sub">{product.description}</div>}
                    </td>
                    <td>
                      <span className="adm-badge adm-badge-gray">{categoryLabel(product.category)}</span>
                    </td>
                    <td>
                      <span className={`adm-badge ${product.condition === 'new' ? 'adm-badge-green' : 'adm-badge-amber'}`}>
                        {conditionLabel(product.condition)}
                      </span>
                    </td>
                    <td>
                      {product.price != null ? `$${Number(product.price).toFixed(2)}` : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {product.active
                          ? <span className="adm-badge adm-badge-green">Active</span>
                          : <span className="adm-badge adm-badge-gray">Hidden</span>
                        }
                        {!product.in_stock && (
                          <span className="adm-badge adm-badge-red">Sold Out</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="adm-actions">
                        <button className="adm-btn adm-btn-ghost" onClick={() => openEdit(product)}>Edit</button>
                        <button className="adm-btn adm-btn-danger-ghost" onClick={() => setConfirmId(product.id)}>Delete</button>
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
        title={editing ? 'Edit Product' : 'Add New Product'}
        footer={
          <>
            <button className="adm-btn adm-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="adm-btn adm-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Product'}
            </button>
          </>
        }
      >
        <form className="adm-form" onSubmit={handleSubmit} noValidate>
          {formError && <div className="adm-form-err">⚠ {formError}</div>}

          <div className="adm-field">
            <label htmlFor="em-name">Name <span className="req">*</span></label>
            <input
              id="em-name"
              className={`adm-input${errors.name ? ' err' : ''}`}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. iPhone 13 Pro 128GB"
            />
            {errors.name && <span className="adm-field-err">{errors.name}</span>}
          </div>

          <div className="adm-form-row">
            <div className="adm-field">
              <label htmlFor="em-price">Price ($)</label>
              <input
                id="em-price"
                type="number"
                step="0.01"
                min="0"
                className={`adm-input${errors.price ? ' err' : ''}`}
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="299.99"
              />
              {errors.price && <span className="adm-field-err">{errors.price}</span>}
            </div>
            <div className="adm-field">
              <label htmlFor="em-cat">Category</label>
              <select
                id="em-cat"
                className="adm-select"
                value={form.category}
                onChange={e => set('category', e.target.value)}
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="adm-field">
            <label htmlFor="em-condition">Condition</label>
            <select
              id="em-condition"
              className="adm-select"
              value={form.condition}
              onChange={e => set('condition', e.target.value)}
            >
              {CONDITIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="adm-field">
            <label htmlFor="em-desc">Description</label>
            <textarea
              id="em-desc"
              className="adm-textarea"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Brief description of the product…"
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
              <strong>In Stock</strong>
              <span>Show as available — uncheck when sold</span>
            </div>
            <label className="adm-switch">
              <input type="checkbox" checked={form.in_stock} onChange={e => set('in_stock', e.target.checked)} />
              <span className="adm-switch-track" />
            </label>
          </div>

          <div className="adm-toggle-row">
            <div className="adm-toggle-text">
              <strong>Active</strong>
              <span>Show this product in Electronics</span>
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
        title="Delete this product?"
        message="This will permanently remove the product from Electronics. This action cannot be undone."
      />

      <Toast toast={toast} />
    </div>
  )
}
