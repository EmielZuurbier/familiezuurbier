'use client'
import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react'
import { partnershipPath } from '@/lib/connections'
export type PartnershipFlowEdge = Edge<{ detour: boolean; lane: number }, 'partnership'>
export function PartnershipEdge(props: EdgeProps<PartnershipFlowEdge>) {
  const path = props.data?.detour
    ? partnershipPath(props.sourceX, props.sourceY, props.targetX, props.targetY, props.data.lane)
    : getBezierPath(props)[0]
  return <BaseEdge id={props.id} path={path} style={props.style} />
}
