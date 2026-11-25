export type Point = { x: number; y: number }
export type Viewport = Point & { zoom: number }
export type CanvasSize = { width: number; height: number }
export type Bounds = Point & CanvasSize
// Screen pixels, independent of tree size and zoom. Decoration, never navigation.
export const MOUSE_AMPLITUDES = { slow: 6, normal: 12, fast: 20 } as const
export const OFFSCREEN_MARGIN = 16
export type PanSample = {
  point: Point
  pointerType: string
  buttons: number
  enabled: boolean
  exempt: boolean
  now: number
  wheelUntil: number
}
export type ParallaxAnchor = { point: Point; size: CanvasSize; amplitude: number }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/** Stop only when the complete diagram is just outside the viewport. Small trees
 * have the same freedom as large ones; releasing a drag never recentres. */
export function constrainViewport(current: Viewport, bounds: Bounds, size: CanvasSize): Viewport {
  const axis = (translation: number, start: number, length: number, size: number) =>
    clamp(
      translation,
      -(start + length) * current.zoom - OFFSCREEN_MARGIN,
      size - start * current.zoom + OFFSCREEN_MARGIN,
    )
  return {
    ...current,
    x: axis(current.x, bounds.x, bounds.width, size.width),
    y: axis(current.y, bounds.y, bounds.height, size.height),
  }
}

/** React Flow/D3 constrains gestures while they happen, rather than correcting
 * the camera afterwards. One viewport outside each edge gives screen-space limits. */
export function navigationExtent(
  bounds: Bounds,
  size: CanvasSize,
  zoom: number,
): [[number, number], [number, number]] {
  const x = (size.width + OFFSCREEN_MARGIN) / zoom,
    y = (size.height + OFFSCREEN_MARGIN) / zoom
  return [
    [bounds.x - x, bounds.y - y],
    [bounds.x + bounds.width + x, bounds.y + bounds.height + y],
  ]
}

export function parallaxOffset(
  anchor: ParallaxAnchor | null,
  sample: PanSample,
  size: CanvasSize,
  amplitude: number,
): { anchor: ParallaxAnchor | null; offset: Point } {
  const zero = { x: 0, y: 0 }
  if (
    !sample.enabled ||
    sample.exempt ||
    sample.buttons !== 0 ||
    sample.pointerType !== 'mouse' ||
    sample.now < sample.wheelUntil ||
    size.width <= 0 ||
    size.height <= 0
  )
    return { anchor: null, offset: zero }
  if (
    !anchor ||
    anchor.amplitude !== amplitude ||
    anchor.size.width !== size.width ||
    anchor.size.height !== size.height
  )
    return { anchor: { point: sample.point, size, amplitude }, offset: zero }
  return {
    anchor,
    offset: {
      x: clamp(
        (-(sample.point.x - anchor.point.x) * 2 * amplitude) / size.width,
        -amplitude,
        amplitude,
      ),
      y: clamp(
        (-(sample.point.y - anchor.point.y) * 2 * amplitude) / size.height,
        -amplitude,
        amplitude,
      ),
    },
  }
}
