'use client'
import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react'
import { parentagePath } from '@/lib/connections'
export type ParentageFlowEdge = Edge<
  { junction?: { x: number; y: number }; path?: string },
  'parentage'
>
export function ParentageEdge(props: EdgeProps<ParentageFlowEdge>) {
  const path =
    props.data?.path ??
    (props.data?.junction
      ? parentagePath(
          props.sourceX,
          props.sourceY,
          props.targetX,
          props.targetY,
          props.data.junction,
        )
      : getBezierPath(props)[0])
  return <BaseEdge id={props.id} path={path} style={props.style} />
}
