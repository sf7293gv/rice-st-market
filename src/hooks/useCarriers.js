// Carriers from the `carriers` table, shared by the Footer, Home, Plans and the store JSON-LD.
// Starts from the build-time snapshot (scripts/prerender.mjs) so pre-rendered HTML contains the
// carrier names and hydrates without a mismatch, then refreshes once per page load from Supabase.
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getPrerenderData } from '../lib/prerenderData'

let liveCarriers = null   // latest rows from Supabase, reused across components and navigations
let request = null        // single in-flight/completed request shared by every caller

export function useCarriers() {
  const [carriers, setCarriers] = useState(() => liveCarriers ?? getPrerenderData('carriers') ?? [])

  useEffect(() => {
    request ??= supabase
      .from('carriers')
      .select('*')
      .order('display_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('carriers fetch error:', error)
        if (data) liveCarriers = data
        return liveCarriers
      })
    request.then(rows => { if (rows) setCarriers(rows) })
  }, [])

  return carriers
}

// ['A', 'B', 'C'] → "A, B and C"
export function joinNames(names) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
