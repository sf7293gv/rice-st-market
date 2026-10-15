// Store-hours helpers shared by pages that read the Supabase `hours` table.
// "Today" is always computed in the store's timezone, not the visitor's browser timezone.

export const STORE_TIMEZONE = 'America/Chicago'

export const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Fallback used only until (or if) the hours table fails to load.
export const DEFAULT_OPEN = '12:00'
export const DEFAULT_CLOSE = '21:00'
export const DEFAULT_HOURS = DAYS_ORDER.map(day => ({
  day, open_time: DEFAULT_OPEN, close_time: DEFAULT_CLOSE, is_closed: false,
}))

// Weekday name ("Monday") for right now in the store's timezone.
export function storeTodayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: STORE_TIMEZONE })
}

// YYYY-MM-DD for a date in the store's timezone.
export function storeDateStr(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: STORE_TIMEZONE })
}

// "21:00" → "9:00 PM"
export function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// "21:00" → 1260
export function toMins(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Minutes since midnight right now in the store's timezone.
export function storeNowMins(date = new Date()) {
  const [h, m] = date
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: STORE_TIMEZONE })
    .split(':').map(Number)
  return h * 60 + m
}

// Open/closed status for the store right now, e.g.
// { isOpen: true, label: 'Open Now · Closes 9:00 PM' } or
// { isOpen: false, label: 'Closed Now · Opens Tomorrow at 12:00 PM' }.
export function storeStatus(rows, date = new Date()) {
  const todayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: STORE_TIMEZONE })
  const nowMins = storeNowMins(date)
  const rowFor = day => rows.find(h => h.day === day)
  const today = rowFor(todayName)

  if (today && !today.is_closed) {
    if (nowMins >= toMins(today.open_time) && nowMins < toMins(today.close_time)) {
      return { isOpen: true, label: `Open Now · Closes ${fmtTime(today.close_time)}` }
    }
    if (nowMins < toMins(today.open_time)) {
      return { isOpen: false, label: `Closed Now · Opens Today at ${fmtTime(today.open_time)}` }
    }
  }

  const todayIdx = DAYS_ORDER.indexOf(todayName)
  for (let i = 1; i <= 7; i++) {
    const day = DAYS_ORDER[(todayIdx + i) % 7]
    const row = rowFor(day)
    if (row && !row.is_closed) {
      const when = i === 1 ? 'Tomorrow' : day
      return { isOpen: false, label: `Closed Now · Opens ${when} at ${fmtTime(row.open_time)}` }
    }
  }
  return { isOpen: false, label: 'Closed Now' }
}
