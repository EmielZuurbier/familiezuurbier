import { organicConnections } from './organic-connections'
import type { RoutingRequest, RoutingResponse } from './organic-routing-store'

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<RoutingRequest>) => void) | null
  postMessage: (message: RoutingResponse) => void
}
scope.onmessage = ({ data }) => {
  try {
    scope.postMessage({ id: data.id, routes: organicConnections(data.family, data.placements) })
  } catch {
    scope.postMessage({ id: data.id, error: true })
  }
}
