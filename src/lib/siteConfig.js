// Site-wide feature flags and config. No config/constants file existed in the
// original codebase (store info is hardcoded per-page — see clone notes), so
// this file was added to hold the Tobacco page toggle and store info.
export const SHOW_TOBACCO_PAGE = false

export const STORE_NAME = "Rice St Market Wireless & Deli"
export const STORE_NAME_SHORT = "Rice St Market"
export const STORE_INITIALS = "RSM"
export const STORE_ADDRESS = "1110 Rice St, St Paul, MN 55117"
export const STORE_PHONE = "(612) 459-7870"
// Derived tel: URI for phone links, e.g. href="tel:+16124597870"
export const STORE_PHONE_TEL = `tel:+1${STORE_PHONE.replace(/\D/g, '')}`
