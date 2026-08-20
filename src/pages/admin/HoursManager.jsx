// Store hours CRUD — one row per day of the week. On save, rows without an id are inserted
// and rows with an id are updated. Times are nulled out for closed days.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import Toast from './Toast'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function HoursManager() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchHours = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('hours').select('*').order('id')
    if (data) {
      const map = Object.fromEntries(data.map(r => [r.day, r]))
      setRows(DAYS.map(day =>
        map[day] ?? { day, open_time: '08:00', close_time: '22:00', is_closed: false }
      ))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchHours() }, [fetchHours])

  function update(day, field, value) {
    setRows(prev => prev.map(r => r.day === day ? { ...r, [field]: value } : r))
    setDirty(true)
    setSaveError(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)

    const toInsert = rows.filter(r => !r.id)
    const toUpdate = rows.filter(r => r.id)

    const payload = r => ({
      open_time:  r.is_closed ? null : (r.open_time  || '08:00'),
      close_time: r.is_closed ? null : (r.close_time || '22:00'),
      is_closed:  r.is_closed,
    })

    const ops = [
      ...(toInsert.length
        ? [supabase.from('hours').insert(toInsert.map(r => ({ day: r.day, ...payload(r) })))]
        : []),
      ...toUpdate.map(r =>
        supabase.from('hours').update(payload(r)).eq('id', r.id)
      ),
    ]

    const results = await Promise.all(ops)
    const firstError = results.find(r => r.error)?.error

    setSaving(false)
    if (firstError) {
      setSaveError(firstError.message)
      showToast('Failed to save: ' + firstError.message, 'error')
    } else {
      setDirty(false)
      showToast('Store hours saved successfully.')
      await fetchHours()
    }
  }

  return (
    <div>
      <div className="adm-manager-bar">
        <div>
          <h1>Store Hours</h1>
          <p>Set opening and closing times for each day of the week.</p>
        </div>
        <button
          className="adm-btn adm-btn-primary"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? 'Saving…' : dirty ? 'Save Changes' : 'No Changes'}
        </button>
      </div>

      {saveError && (
        <div className="adm-form-err" style={{ marginBottom: 16 }}>⚠ {saveError}</div>
      )}

      <div className="adm-table-card hours-editor">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" />Loading hours…</div>
        ) : (
          <>
            <div className="hours-header-row">
              <span>Day</span>
              <span>Open Time</span>
              <span>Close Time</span>
              <span>Mark Closed</span>
            </div>
            {rows.map(row => (
              <div key={row.day} className={`hours-row${row.is_closed ? ' is-closed' : ''}`}>

                <div className="hours-day-cell">
                  <span className="hours-day-name">{row.day}</span>
                  {row.is_closed && <span className="hours-closed-tag">Closed</span>}
                </div>

                <div className="hours-time-cell">
                  <input
                    type="time"
                    className="adm-input hours-time-input"
                    value={row.open_time ?? ''}
                    onChange={e => update(row.day, 'open_time', e.target.value)}
                    disabled={row.is_closed}
                    aria-label={`${row.day} open time`}
                  />
                </div>

                <div className="hours-time-cell">
                  <input
                    type="time"
                    className="adm-input hours-time-input"
                    value={row.close_time ?? ''}
                    onChange={e => update(row.day, 'close_time', e.target.value)}
                    disabled={row.is_closed}
                    aria-label={`${row.day} close time`}
                  />
                </div>

                <div className="hours-toggle-cell">
                  <label className="adm-switch" aria-label={`Mark ${row.day} as closed`}>
                    <input
                      type="checkbox"
                      checked={row.is_closed}
                      onChange={e => update(row.day, 'is_closed', e.target.checked)}
                    />
                    <span className="adm-switch-track" />
                  </label>
                </div>

              </div>
            ))}
          </>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  )
}
