export type Point = { x: number; y: number }
export type Viewport = Point & { zoom: number }
export type CanvasSize = { width: number; height: number }
export type Bounds = Point & CanvasSize
export type PanSample = {
  point: Point
  pointerType: string
  buttons: number
  enabled: boolean
  exempt: boolean
  now: number
  wheelUntil: number
}
export type PanAnchor = {
  point: Point
  last: Point
  viewport: Viewport
  size: CanvasSize
}
const clamp = (n: number) => Math.max(0, Math.min(1, n))
// Screen-space breathing room remains useful at every zoom, in either layout.
const viewPadding = (size: number) => Math.min(112, size / 5)
const pointerPadding = (size: number) => Math.min(140, size / 4)

export function constrainViewport(current: Viewport, bounds: Bounds, size: CanvasSize): Viewport {
  const axis = (translation: number, start: number, length: number, size: number) => {
    const padding = viewPadding(size)
    if (length * current.zoom <= size - padding * 2)
      return (size - length * current.zoom) / 2 - start * current.zoom
    const near = padding - start * current.zoom,
      far = size - padding - (start + length) * current.zoom
    return Math.max(far, Math.min(near, translation))
  }
  return {
    ...current,
    x: axis(current.x, bounds.x, bounds.width, size.width),
    y: axis(current.y, bounds.y, bounds.height, size.height),
  }
}

function axisPosition(
  point: number,
  anchorPoint: number,
  anchorTranslation: number,
  start: number,
  length: number,
  size: number,
  zoom: number,
  speed: number,
): number {
  const padding = viewPadding(size)
  if (length * zoom <= size - padding * 2) {
    return (size - length * zoom) / 2 - start * zoom
  }
  const near = padding - start * zoom
  const far = size - padding - (start + length) * zoom
  const inset = pointerPadding(size)
  // Interior anchors reach both ends before the pointer reaches the border.
  // Keep a short movement range when entering in that outer margin, so the
  // first small movement cannot snap the view to an absolute endpoint.
  const minimumTravel = Math.min(64, size / 6)
  const nearPoint = Math.min(inset, anchorPoint - minimumTravel)
  const farPoint = Math.max(size - inset, anchorPoint + minimumTravel)
  const exponent = 0.65 / Math.max(0.1, speed)
  if (point < anchorPoint) {
    const progress = clamp((anchorPoint - point) / (anchorPoint - nearPoint)) ** exponent
    return anchorTranslation + (near - anchorTranslation) * progress
  }
  if (point > anchorPoint) {
    const progress = clamp((point - anchorPoint) / (farPoint - anchorPoint)) ** exponent
    return anchorTranslation + (far - anchorTranslation) * progress
  }
  return anchorTranslation
}

// Moving the pointer right/down explores right/down: the diagram moves left/up.
// Re-anchor after entry, focus, buttons or wheel use, avoiding a jump to an absolute
// page coordinate. Piecewise interpolation still reaches both extremes in one pass.
// There is no timer, velocity or easing: a stationary pointer cannot move the view.
export function panViewport(
  anchor: PanAnchor | null,
  sample: PanSample,
  current: Viewport,
  bounds: Bounds,
  size: CanvasSize,
  speed: number,
): { anchor: PanAnchor | null; viewport: Viewport | null } {
  if (
    !sample.enabled ||
    sample.exempt ||
    sample.buttons !== 0 ||
    sample.pointerType !== 'mouse' ||
    sample.now < sample.wheelUntil ||
    size.width <= 0 ||
    size.height <= 0
  )
    return { anchor: null, viewport: null }
  if (
    !anchor ||
    anchor.viewport.zoom !== current.zoom ||
    anchor.size.width !== size.width ||
    anchor.size.height !== size.height
  )
    return {
      anchor: { point: sample.point, last: sample.point, viewport: current, size },
      viewport: null,
    }
  if (anchor.last.x === sample.point.x && anchor.last.y === sample.point.y) {
    return { anchor, viewport: null }
  }
  return {
    anchor: { ...anchor, last: sample.point },
    viewport: {
      x: axisPosition(
        sample.point.x,
        anchor.point.x,
        anchor.viewport.x,
        bounds.x,
        bounds.width,
        size.width,
        current.zoom,
        speed,
      ),
      y: axisPosition(
        sample.point.y,
        anchor.point.y,
        anchor.viewport.y,
        bounds.y,
        bounds.height,
        size.height,
        current.zoom,
        speed,
      ),
      zoom: current.zoom,
    },
  }
}
