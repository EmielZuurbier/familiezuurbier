import type { Family } from './types'
import type { Placement } from './layout'
import { organicConnections, type OrganicConnection } from './organic-connections'

export type RoutingRequest = { id: number; family: Family; placements: Placement[] }
export type RoutingResponse = { id: number; routes?: OrganicConnection[]; error?: boolean }
type Snapshot = { key: string; routes?: OrganicConnection[]; error?: boolean } | null

/** Owned by one mounted tree, never shared between visitors or persisted.
 * Geometry work stays off the input thread, and stale worker replies are ignored. */
export class OrganicRoutingStore {
  private listeners = new Set<() => void>()
  private cache = new Map<string, OrganicConnection[]>()
  private snapshot: Snapshot = null
  private worker: Worker | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private request = 0
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  getSnapshot = () => this.snapshot
  private emit() {
    this.listeners.forEach((listener) => listener())
  }
  cancel = () => {
    this.request++
    this.worker?.terminate()
    this.worker = null
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
  }
  update(key: string, family: Family, placements: Placement[], retry = false) {
    this.cancel()
    if (!key) return
    if (retry) this.cache.delete(key)
    const cached = this.cache.get(key)
    if (cached) {
      this.cache.delete(key)
      this.cache.set(key, cached)
      this.snapshot = { key, routes: cached }
      this.emit()
      return
    }
    this.snapshot = { key }
    this.emit()
    const id = this.request
    let settled = false
    const finish = (response: RoutingResponse) => {
      if (response.id !== this.request || settled) return
      settled = true
      this.worker?.terminate()
      this.worker = null
      if (response.routes) {
        // Keep only the last two geometries for toggling layouts/family focus.
        if (this.cache.size >= 2) this.cache.delete(this.cache.keys().next().value!)
        this.cache.set(key, response.routes)
      }
      this.snapshot = { key, routes: response.routes, error: !!response.error }
      this.emit()
    }
    const fallback = () => {
      if (id !== this.request || settled) return
      this.worker?.terminate()
      this.worker = null
      // Older browsers still get all connections if workers are unavailable.
      // Yield once so the cards and the loading indication can paint first.
      this.timer = setTimeout(() => {
        if (id !== this.request) return
        this.timer = null
        try {
          finish({ id, routes: organicConnections(family, placements) })
        } catch {
          finish({ id, error: true })
        }
      }, 0)
    }
    try {
      this.worker = new Worker(new URL('./organic-routing.worker.ts', import.meta.url), {
        type: 'module',
      })
      this.worker.onmessage = ({ data }: MessageEvent<RoutingResponse>) => finish(data)
      this.worker.onerror = (event) => {
        event.preventDefault()
        fallback()
      }
      this.worker.postMessage({ id, family, placements } satisfies RoutingRequest)
    } catch {
      fallback()
    }
  }
}
