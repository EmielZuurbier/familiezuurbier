'use client'
import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react'
import { useMemo } from 'react'
import { parentagePath } from '@/lib/connections'
import { sampleEdge, taperedEdge } from '@/lib/edge-geometry'
export type ParentageFlowEdge = Edge<
  { junction?: { x: number; y: number }; path?: string; taper?: boolean },
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
  const outline = useMemo(
    () => (props.data?.taper ? taperedEdge(sampleEdge(path)) : ''),
    [path, props.data?.taper],
  )
  return outline ? (
    <path
      className="react-flow__edge-path organic-parentage-ribbon"
      d={outline}
      style={{ ...props.style, stroke: 'none', fill: props.style?.stroke ?? '#718d74' }}
      aria-hidden="true"
    />
  ) : (
    <BaseEdge id={props.id} path={path} style={props.style} />
  )
}
