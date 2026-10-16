// Store structured data (schema.org MobilePhoneStore, a LocalBusiness type) for every public page:
// name, address, phones, opening hours and the carriers we carry. Hours and carriers come from
// the build-time snapshot so they're in the pre-rendered HTML; carriers refresh live after mount.
import { Helmet } from 'react-helmet-async'
import { useCarriers, joinNames } from '../hooks/useCarriers'
import { getPrerenderData } from '../lib/prerenderData'
import { DEFAULT_HOURS, DAYS_ORDER } from '../lib/hours'
import { STORE_NAME, STORE_ADDRESS_PARTS, STORE_PHONE, STORE_PHONE_2, SITE_URL } from '../lib/siteConfig'

const toE164 = phone => `+1${phone.replace(/\D/g, '')}`

// Group days that share the same hours into one OpeningHoursSpecification each.
function openingHours(rows) {
  const groups = new Map()
  for (const day of DAYS_ORDER) {
    const row = rows.find(h => h.day === day)
    if (!row || row.is_closed) continue
    const key = `${row.open_time}-${row.close_time}`
    if (!groups.has(key)) groups.set(key, { opens: row.open_time, closes: row.close_time, days: [] })
    groups.get(key).days.push(day)
  }
  return [...groups.values()].map(g => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: g.days,
    opens: g.opens,
    closes: g.closes,
  }))
}

export default function StoreJsonLd() {
  const carrierNames = useCarriers().map(c => c.name)
  const hours = getPrerenderData('hours') ?? DEFAULT_HOURS

  const services = 'phone repair, electronics, grocery and deli'
  const description = carrierNames.length
    ? `Wireless retailer carrying ${joinNames(carrierNames)} prepaid and wireless service, plus ${services}.`
    : `Neighborhood wireless retailer offering ${services}.`

  const data = {
    '@context': 'https://schema.org',
    '@type': 'MobilePhoneStore',
    name: STORE_NAME,
    url: SITE_URL,
    description,
    telephone: toE164(STORE_PHONE),
    contactPoint: [STORE_PHONE, STORE_PHONE_2].map(phone => ({
      '@type': 'ContactPoint',
      telephone: toE164(phone),
      contactType: 'customer service',
    })),
    address: { '@type': 'PostalAddress', ...STORE_ADDRESS_PARTS },
    openingHoursSpecification: openingHours(hours),
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  )
}
