// False during the build-time prerender and the hydration render, true afterwards.
// Use it for anything that depends on the current time or browser state (open-now badge,
// "today" highlights, date limits) so pre-rendered HTML and the first client render match.
// On pages that aren't pre-rendered (createRoot), it is true from the first render.
import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false)
}
