// Inquiries manager — read/delete product inquiries submitted from the Electronics page.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function InquiriesManager() {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchInquiries = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setInquiries(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchInquiries() }, [fetchInquiries])

  async function markRead(id) {
    const { error } = await supabase
      .from('inquiries')
      .update({ status: 'read' })
      .eq('id', id)
    if (error) {
      showToast('Update failed: ' + error.message, 'error')
    } else {
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: 'read' } : i))
    }
  }

  async function handleDelete() {
    const { error } = await supabase.from('inquiries').delete().eq('id', confirmId)
    setConfirmId(null)
    if (error) {
      showToast('Delete failed: ' + error.message, 'error')
    } else {
      await fetchInquiries()
      showToast('Inquiry deleted.')
    }
  }

  const totalCount = inquiries.length
  const newCount   = inquiries.filter(i => i.status === 'new').length

  return (
    <div>
      <div className="adm-manager-bar">
        <div>
          <h1>Inquiries</h1>
          <p>{totalCount} total &middot; {newCount} unread</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="adm-stats" style={{ marginBottom: '24px' }}>
        <div className="adm-stat">
          <div className="adm-stat-icon amber"><InboxIcon /></div>
          <div>
            <div className="adm-stat-val">{loading ? '—' : totalCount}</div>
            <div className="adm-stat-lbl">Total Inquiries</div>
          </div>
        </div>
        <div className={`adm-stat${!loading && newCount > 0 ? ' dash-stat-alert' : ''}`}>
          <div className={`adm-stat-icon ${!loading && newCount > 0 ? 'red' : 'green'}`}><NewIcon /></div>
          <div>
            <div className="adm-stat-val">{loading ? '—' : newCount}</div>
            <div className="adm-stat-lbl">
              Unread
              {!loading && newCount > 0 && <span className="dash-alert-dot" aria-label="Needs attention" />}
            </div>
          </div>
        </div>
      </div>

      <div className="adm-table-card">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" />Loading inquiries…</div>
        ) : inquiries.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-icon">💬</div>
            <div className="adm-empty-title">No inquiries yet</div>
            <div className="adm-empty-sub">Customer inquiries from the Electronics page will appear here.</div>
          </div>
        ) : (
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map(inq => (
                  <tr key={inq.id}>
                    <td>
                      <div className="adm-item-name">{inq.product_name}</div>
                    </td>
                    <td>
                      <div className="adm-item-name">{inq.customer_name}</div>
                    </td>
                    <td>
                      <a
                        href={`tel:${inq.customer_phone}`}
                        style={{ color: 'var(--adm-red)', fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}
                      >
                        {inq.customer_phone}
                      </a>
                    </td>
                    <td style={{ maxWidth: '260px' }}>
                      <div className="adm-item-sub" style={{ whiteSpace: 'normal', lineHeight: '1.5' }}>
                        {inq.message}
                      </div>
                    </td>
                    <td>
                      {inq.status === 'new'
                        ? <span className="adm-badge adm-badge-amber">New</span>
                        : <span className="adm-badge adm-badge-gray">Read</span>
                      }
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>
                      {fmtDate(inq.created_at)}
                    </td>
                    <td>
                      <div className="adm-actions">
                        {inq.status === 'new' && (
                          <button
                            className="adm-btn adm-btn-ghost"
                            onClick={() => markRead(inq.id)}
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          className="adm-btn adm-btn-danger-ghost"
                          onClick={() => setConfirmId(inq.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete this inquiry?"
        message="This will permanently remove the inquiry. This action cannot be undone."
      />

      <Toast toast={toast} />
    </div>
  )
}

function InboxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  )
}

function NewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}
