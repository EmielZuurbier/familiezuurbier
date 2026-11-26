import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OrganicRoutingStore,
  type RoutingRequest,
  type RoutingResponse,
} from '../src/lib/organic-routing-store'
import type { Family } from '../src/lib/types'

class RoutingWorker {
  static instances: RoutingWorker[] = []
  onmessage: ((event: MessageEvent<RoutingResponse>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  request!: RoutingRequest
  terminated = false
  constructor() {
    RoutingWorker.instances.push(this)
  }
  postMessage(request: RoutingRequest) {
    this.request = request
  }
  terminate() {
    this.terminated = true
  }
  finish() {
    this.onmessage?.({
      data: { id: this.request.id, routes: [] },
    } as unknown as MessageEvent<RoutingResponse>)
  }
  fail() {
    this.onerror?.({ preventDefault() {} } as ErrorEvent)
  }
}
const family: Family = { people: [], parentages: [], partnerships: [] }
beforeEach(() => {
  RoutingWorker.instances = []
  vi.stubGlobal('Worker', RoutingWorker)
  vi.useFakeTimers()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Routeberekening buiten de bediening van de stamboom', () => {
  it('laat een verouderd resultaat een nieuwere indeling niet overschrijven', () => {
    const store = new OrganicRoutingStore()
    store.update('eerste', family, [])
    const first = RoutingWorker.instances[0]
    store.update('tweede', family, [])
    const second = RoutingWorker.instances[1]
    first.finish()
    expect(store.getSnapshot()).toEqual({ key: 'tweede' })
    second.finish()
    expect(store.getSnapshot()).toEqual({ key: 'tweede', routes: [], error: false })
    expect(first.terminated).toBe(true)
    expect(second.terminated).toBe(true)
  })
  it('gebruikt een gereed resultaat opnieuw na wisselen van layout of gezinsfocus', () => {
    const store = new OrganicRoutingStore()
    store.update('boom', family, [])
    RoutingWorker.instances[0].finish()
    store.cancel()
    store.update('boom', family, [])
    expect(store.getSnapshot()?.routes).toEqual([])
    expect(RoutingWorker.instances).toHaveLength(1)
  })
  it('houdt de resultaten van afzonderlijke boomweergaven gescheiden', () => {
    const a = new OrganicRoutingStore(),
      b = new OrganicRoutingStore()
    a.update('boom', family, [])
    RoutingWorker.instances[0].finish()
    b.update('boom', family, [])
    expect(RoutingWorker.instances).toHaveLength(2)
    expect(b.getSnapshot()?.routes).toBeUndefined()
  })
  it('laat een late fout uit een verlaten indeling de actieve taak niet stoppen', () => {
    const store = new OrganicRoutingStore()
    store.update('oud', family, [])
    const old = RoutingWorker.instances[0]
    store.update('nieuw', family, [])
    const current = RoutingWorker.instances[1]
    old.fail()
    vi.runAllTimers()
    expect(current.terminated).toBe(false)
    expect(store.getSnapshot()).toEqual({ key: 'nieuw' })
    current.finish()
    expect(store.getSnapshot()?.routes).toEqual([])
  })
  it('kan opnieuw berekenen en heeft een werkend alternatief zonder worker', () => {
    const store = new OrganicRoutingStore()
    store.update('boom', family, [])
    RoutingWorker.instances[0].fail()
    vi.runAllTimers()
    expect(store.getSnapshot()?.routes).toEqual([])
    store.update('boom', family, [], true)
    expect(RoutingWorker.instances).toHaveLength(2)
    expect(store.getSnapshot()?.routes).toBeUndefined()
    store.cancel()
  })
})
