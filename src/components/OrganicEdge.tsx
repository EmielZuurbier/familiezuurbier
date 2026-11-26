'use client'
import { BaseEdge, type Edge, type EdgeProps } from '@xyflow/react'
import type { OrganicConnection } from '@/lib/organic-connections'

export function OrganicEdge({ id, data, style }: EdgeProps<Edge<OrganicConnection, 'organic'>>) {
  if (!data) return null
  if (data.kind === 'partnership') return <BaseEdge id={id} path={data.path} style={style} />
  return (
    <path
      className="react-flow__edge-path organic-parentage-ribbon"
      d={data.outline}
      style={{ ...style, stroke: 'none', fill: style?.stroke ?? '#718d74' }}
      aria-hidden="true"
      data-family-branch={data.group}
      data-start-width={data.startWidth}
      data-end-width={data.endWidth}
      data-underpasses={data.gaps.length}
    />
  )
}
