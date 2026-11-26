'use client'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { OrganicRoutingStore } from '@/lib/organic-routing-store'
import type { Family } from '@/lib/types'
import type { Placement } from '@/lib/layout'

const serverSnapshot = () => null
export function useOrganicConnections(family: Family, placements: Placement[], active: boolean) {
  const [store] = useState(() => new OrganicRoutingStore())
  // The worker needs IDs, birth order and positions, not names, pictures,
  // stories, locations or account information.
  const input = useMemo(() => {
    if (!active) return null
    const graph: Family = {
      people: family.people.map((person) => ({
        id: person.id,
        name: '',
        birth: person.birth,
        death: {},
        lifeStatus: 'unknown',
      })),
      parentages: family.parentages,
      partnerships: family.partnerships,
    }
    return { graph, key: JSON.stringify([graph, placements]) }
  }, [family, placements, active])
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, serverSnapshot)
  useEffect(() => {
    if (input) store.update(input.key, input.graph, placements)
    return store.cancel
  }, [store, input, placements])
  const retry = useCallback(() => {
    if (input) store.update(input.key, input.graph, placements, true)
  }, [store, input, placements])
  const current = input && snapshot?.key === input.key ? snapshot : null
  return {
    routes: current?.routes ?? null,
    pending: active && !current?.routes && !current?.error,
    error: !!current?.error,
    retry,
  }
}
