'use client'
import { useSyncExternalStore } from 'react'
import { useSiteSettings } from './SiteSettingsProvider'

export type TreeStyle = 'structured' | 'organic'
const key = 'familieboom:tree-style:v1'
const changeEvent = 'familieboom:tree-style-change'
let fallback: TreeStyle | undefined
function snapshot(): TreeStyle | undefined {
  if (fallback) return fallback
  try {
    const saved = localStorage.getItem(key)
    return saved === 'organic' || saved === 'structured' ? saved : undefined
  } catch {
    return undefined
  }
}
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      fallback = undefined
      listener()
    }
  }
  window.addEventListener('storage', storage)
  window.addEventListener(changeEvent, listener)
  return () => {
    window.removeEventListener('storage', storage)
    window.removeEventListener(changeEvent, listener)
  }
}
export function useTreeStyle() {
  const settings = useSiteSettings()
  const saved = useSyncExternalStore(subscribe, snapshot, () => undefined)
  const style = saved ?? (settings.options.defaultTreeStyle as TreeStyle)
  const setStyle = (next: TreeStyle) => {
    fallback = next
    try {
      localStorage.setItem(key, next)
    } catch {
      /* Keep the setting for this visit. */
    }
    window.dispatchEvent(new Event(changeEvent))
  }
  return [style, setStyle] as const
}
