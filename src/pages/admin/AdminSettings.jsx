// Admin settings — upserts key/value rows in the settings table (owner_phone, owner_email,
// social URLs, password change). Upsert with onConflict:'key' creates the row on first save.
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { STORE_NAME, STORE_ADDRESS, STORE_PHONE, STORE_PHONE_2 } from '../../lib/siteConfig'
import Toast from './Toast'

const PHONE_EXAMPLE_DIGITS = `1${STORE_PHONE.replace(/\D/g, '')}`

export default function AdminSettings() {
  const [session, setSession]         = useState(null)
  const [ownerPhone, setOwnerPhone]   = useState('')
  const [ownerEmail, setOwnerEmail]   = useState('')
  const [fbUrl, setFbUrl]             = useState('')
  const [igUrl, setIgUrl]             = useState('')
  const [ttUrl, setTtUrl]             = useState('')
  const [savingNotif, setSavingNotif] = useState(false)
  const [savingSocial, setSavingSocial] = useState(false)
  const [toast, setToast]             = useState(null)
  const navigate = useNavigate()

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['owner_phone', 'owner_email', 'facebook_url', 'instagram_url', 'tiktok_url'])
    if (data) {
      const get = (k) => data.find(r => r.key === k)?.value ?? ''
      setOwnerPhone(get('owner_phone'))
      setOwnerEmail(get('owner_email'))
      setFbUrl(get('facebook_url'))
      setIgUrl(get('instagram_url'))
      setTtUrl(get('tiktok_url'))
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  async function handleSaveNotifications(e) {
    e.preventDefault()
    setSavingNotif(true)
    const { error } = await supabase.from('settings').upsert(
      [
        { key: 'owner_phone', value: ownerPhone.trim() },
        { key: 'owner_email', value: ownerEmail.trim() },
      ],
      { onConflict: 'key' }
    )
    setSavingNotif(false)
    if (error) { showToast('Failed to save settings', 'error'); return }
    showToast('Notification settings saved')
  }

  async function handleSaveSocial(e) {
    e.preventDefault()
    setSavingSocial(true)
    const { error } = await supabase.from('settings').upsert(
      [
        { key: 'facebook_url',  value: fbUrl.trim() },
        { key: 'instagram_url', value: igUrl.trim() },
        { key: 'tiktok_url',    value: ttUrl.trim() },
      ],
      { onConflict: 'key' }
    )
    setSavingSocial(false)
    if (error) { showToast('Failed to save social links', 'error'); return }
    showToast('Social media links saved')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  const email   = session?.user?.email ?? '—'
  const created = session?.user?.created_at
    ? new Date(session.user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  return (
    <div>
      <div className="adm-page-header">
        <h1>Settings</h1>
        <p>Manage your admin account and store notifications.</p>
      </div>

      {/* Notification settings */}
      <div className="adm-settings-section">
        <h2>Booking Notifications</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--adm-text-muted)', marginBottom: 20, lineHeight: 1.55 }}>
          When a customer submits a repair booking, they'll see a WhatsApp button pre-filled with their booking details to send to this number.
          The email is shown as a fallback contact.
        </p>
        <form className="adm-form" onSubmit={handleSaveNotifications}>
          <div className="adm-form-row">
            <div className="adm-field">
              <label>
                WhatsApp / Phone number
                <span style={{ fontSize: '0.68rem', fontWeight: 400, color: 'var(--adm-text-muted)', textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>
                  include country code, e.g. {PHONE_EXAMPLE_DIGITS}
                </span>
              </label>
              <input
                type="tel"
                className="adm-input"
                placeholder={PHONE_EXAMPLE_DIGITS}
                value={ownerPhone}
                onChange={e => setOwnerPhone(e.target.value)}
              />
            </div>
            <div className="adm-field">
              <label>Notification email</label>
              <input
                type="email"
                className="adm-input"
                placeholder="owner@example.com"
                value={ownerEmail}
                onChange={e => setOwnerEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="adm-btn adm-btn-primary"
              disabled={savingNotif}
            >
              {savingNotif ? 'Saving…' : 'Save Notification Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Social media links */}
      <div className="adm-settings-section">
        <h2>Social Media Links</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--adm-text-muted)', marginBottom: 20, lineHeight: 1.55 }}>
          These links appear as icons in the site footer. Leave a field blank to hide that icon.
        </p>
        <form className="adm-form" onSubmit={handleSaveSocial}>
          <div className="adm-field">
            <label htmlFor="s-fb">Facebook URL</label>
            <input
              id="s-fb"
              type="url"
              className="adm-input"
              placeholder="https://facebook.com/your-page"
              value={fbUrl}
              onChange={e => setFbUrl(e.target.value)}
            />
          </div>
          <div className="adm-field">
            <label htmlFor="s-ig">Instagram URL</label>
            <input
              id="s-ig"
              type="url"
              className="adm-input"
              placeholder="https://instagram.com/your-handle"
              value={igUrl}
              onChange={e => setIgUrl(e.target.value)}
            />
          </div>
          <div className="adm-field">
            <label htmlFor="s-tt">TikTok URL</label>
            <input
              id="s-tt"
              type="url"
              className="adm-input"
              placeholder="https://tiktok.com/@your-handle"
              value={ttUrl}
              onChange={e => setTtUrl(e.target.value)}
            />
          </div>
          <div>
            <button
              type="submit"
              className="adm-btn adm-btn-primary"
              disabled={savingSocial}
            >
              {savingSocial ? 'Saving…' : 'Save Social Links'}
            </button>
          </div>
        </form>
      </div>

      {/* Account */}
      <div className="adm-settings-section">
        <h2>Account</h2>
        <div className="adm-info-row">
          <span className="lbl">Email</span>
          <span className="val">{email}</span>
        </div>
        <div className="adm-info-row">
          <span className="lbl">Account created</span>
          <span className="val">{created}</span>
        </div>
        <div className="adm-info-row">
          <span className="lbl">Role</span>
          <span className="val">Administrator</span>
        </div>
      </div>

      {/* Store info */}
      <div className="adm-settings-section">
        <h2>Store Info</h2>
        <div className="adm-info-row">
          <span className="lbl">Store name</span>
          <span className="val">{STORE_NAME}</span>
        </div>
        <div className="adm-info-row">
          <span className="lbl">Address</span>
          <span className="val">{STORE_ADDRESS}</span>
        </div>
        <div className="adm-info-row">
          <span className="lbl">Phone</span>
          <span className="val">{STORE_PHONE} · {STORE_PHONE_2}</span>
        </div>
        <div className="adm-info-row">
          <span className="lbl">Hours</span>
          <span className="val">12:00 PM – 9:00 PM, every day</span>
        </div>
      </div>

      {/* Danger zone */}
      <div className="adm-settings-section danger">
        <h2>Danger Zone</h2>
        <div className="adm-danger-row">
          <div>
            <h3>Sign out of admin panel</h3>
            <p>You will be returned to the login page.</p>
          </div>
          <button className="adm-btn adm-btn-secondary" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
