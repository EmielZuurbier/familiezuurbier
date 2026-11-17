'use client'
import { useSyncExternalStore } from 'react'

export type TreeStyle = 'structured' | 'organic'
const key = 'familieboom:tree-style:v1'
const changeEvent = 'familieboom:tree-style-change'
let fallback: TreeStyle | undefined
function snapshot(): TreeStyle {
  if (fallback) return fallback
  try {
    return localStorage.getItem(key) === 'organic' ? 'organic' : 'structured'
  } catch {
    return 'structured'
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
  const style = useSyncExternalStore(subscribe, snapshot, () => 'structured' as TreeStyle)
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
