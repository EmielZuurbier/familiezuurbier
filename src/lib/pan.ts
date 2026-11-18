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
  target: Viewport
  gain: Point
  speed: number
}
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

function axisGain(
  anchorPoint: number,
  anchorTranslation: number,
  start: number,
  length: number,
  size: number,
  zoom: number,
  speed: number,
): number {
  const padding = viewPadding(size)
  if (length * zoom <= size - padding * 2) return 0
  const near = padding - start * zoom
  const far = size - padding - (start + length) * zoom
  const inset = pointerPadding(size)
  // Interior anchors reach both ends before the pointer reaches the border.
  // Keep a short movement range when entering in that outer margin, so the
  // first small movement cannot snap the view to an absolute endpoint.
  const minimumTravel = Math.min(64, size / 6)
  const toNear = Math.max(minimumTravel, anchorPoint - inset)
  const toFar = Math.max(minimumTravel, size - inset - anchorPoint)
  // Use the SAME gain in both directions for this entire interaction. The
  // larger required distance keeps either extreme reachable inside the canvas.
  // Speed changes this constant, never the shape of the response curve.
  return (
    Math.max(
      (near - far) / (size - inset * 2),
      Math.max(0, near - anchorTranslation) / toNear,
      Math.max(0, anchorTranslation - far) / toFar,
    ) * Math.max(1, 0.7 + speed)
  )
}

function axisPosition(
  delta: number,
  translation: number,
  start: number,
  length: number,
  size: number,
  zoom: number,
  gain: number,
): number {
  const padding = viewPadding(size)
  if (length * zoom <= size - padding * 2) return (size - length * zoom) / 2 - start * zoom
  const near = padding - start * zoom
  const far = size - padding - (start + length) * zoom
  // Preserve a deliberately retained focus camera outside the normal bounds:
  // move it back gradually instead of snapping on the first pointer movement.
  return Math.max(
    Math.min(far, translation),
    Math.min(Math.max(near, translation), translation - delta * gain),
  )
}

// Moving the pointer right/down explores right/down: the diagram moves left/up.
// Re-anchor after entry, focus, buttons or wheel use, avoiding a jump to an absolute
// page coordinate. A fixed gain keeps equal pointer steps equal across the field.
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
    anchor.speed !== speed ||
    anchor.size.width !== size.width ||
    anchor.size.height !== size.height
  )
    return {
      anchor: {
        point: sample.point,
        last: sample.point,
        viewport: current,
        target: current,
        size,
        speed,
        gain: {
          x: axisGain(
            sample.point.x,
            current.x,
            bounds.x,
            bounds.width,
            size.width,
            current.zoom,
            speed,
          ),
          y: axisGain(
            sample.point.y,
            current.y,
            bounds.y,
            bounds.height,
            size.height,
            current.zoom,
            speed,
          ),
        },
      },
      viewport: null,
    }
  if (anchor.last.x === sample.point.x && anchor.last.y === sample.point.y) {
    return { anchor, viewport: null }
  }
  const viewport = {
    x: axisPosition(
      sample.point.x - anchor.last.x,
      anchor.target.x,
      bounds.x,
      bounds.width,
      size.width,
      current.zoom,
      anchor.gain.x,
    ),
    y: axisPosition(
      sample.point.y - anchor.last.y,
      anchor.target.y,
      bounds.y,
      bounds.height,
      size.height,
      current.zoom,
      anchor.gain.y,
    ),
    zoom: current.zoom,
  }
  return {
    anchor: { ...anchor, last: sample.point, target: viewport },
    viewport,
  }
}
