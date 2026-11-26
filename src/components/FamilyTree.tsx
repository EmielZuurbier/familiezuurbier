'use client'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import Link from 'next/link'
import {
  Background,
  BackgroundVariant,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import {
  BookOpen,
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  GitBranch,
  LoaderCircle,
  Network,
  TreeDeciduous,
  Focus,
  Heart,
  Leaf,
  Maximize,
  MousePointer2,
  Pause,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
  Minus,
} from 'lucide-react'
import '@xyflow/react/dist/style.css'
import {
  layoutFamily,
  layoutBranchingFamily,
  layoutOrganicFamily,
  CARD_HEIGHT,
  CARD_WIDTH,
} from '@/lib/layout'
import { useTreeStyle } from './useTreeStyle'
import { FamilyBrand } from './FamilyBrand'
import { useSiteSettings } from './SiteSettingsProvider'
import { SidebarHeading } from './SidebarHeading'
import { siteText } from '@/lib/site-settings'
import { placementBounds, stemViewport, UPWARD_BOTTOM_PADDING } from '@/lib/focus'
import {
  familyFocusOptions,
  familyFocusPlacements,
  familyFocusParentagePaths,
  familyFocusViewport,
  type FamilyFocus,
} from '@/lib/family-focus'
import { partnershipDetour, parentageJunctions } from '@/lib/connections'
import { OrganicEdge } from './OrganicEdge'
import { useOrganicConnections } from './useOrganicConnections'
import { ParentageEdge } from './ParentageEdge'
import { PartnershipEdge } from './PartnershipEdge'
import { age, formatDate, years } from '@/lib/dates'
import { eventHref, eventsForPerson } from '@/lib/events/timeline'
import { childOrder } from '@/lib/child-order'
import {
  constrainViewport,
  navigationExtent,
  parallaxOffset,
  MOUSE_AMPLITUDES,
  type ParallaxAnchor,
  type Point,
} from '@/lib/pan'
import { isArrowKey, keyboardViewport, nearestPerson, relatedPerson } from '@/lib/tree-keyboard'
import type { Family, Person } from '@/lib/types'
import { WorkspaceHeader } from './WorkspaceHeader'
import { CompactToolbar } from './CompactToolbar'
import { LifeStatusIcon } from './LifeStatusIcon'
import { PersonAvatar, PersonPortrait } from './PersonAvatar'
import { FamilyAccountControls, type FamilyViewer } from './FamilyAccountControls'

type TreeNode = Node<
  {
    person: Person
    generation: number
    active: boolean
    inFamily: boolean
    outsideFamily: boolean
    growsUpwards: boolean
    onSelect: (id: string) => void
  },
  'person'
>
function PersonCard({ data }: NodeProps<TreeNode>) {
  const statusDescriptionId = useId()
  return (
    <div
      className={`person-card generation-${data.generation % 4} ${data.active ? 'active' : ''} ${data.inFamily ? 'in-family' : ''}`}
    >
      <Handle
        type="target"
        position={data.growsUpwards ? Position.Bottom : Position.Top}
        id="parent"
      />
      <Handle
        type="source"
        position={data.growsUpwards ? Position.Top : Position.Bottom}
        id="child"
      />
      <Handle type="source" position={Position.Right} id="partner-right" />
      <Handle type="target" position={Position.Left} id="partner-left" />
      <button
        className="person-button nodrag"
        onClick={(event) => {
          event.stopPropagation()
          data.onSelect(data.person.id)
        }}
        aria-label={`Bekijk ${data.person.name}`}
        aria-pressed={data.active}
        data-person-id={data.person.id}
        tabIndex={data.outsideFamily ? -1 : 0}
        aria-describedby={data.person.lifeStatus === 'deceased' ? statusDescriptionId : undefined}
      >
        <span className="person-top">
          <PersonAvatar person={data.person} />
          <span className="node-actions">
            {data.person.lifeStatus === 'deceased' && (
              <LifeStatusIcon status="deceased" descriptionId={statusDescriptionId} />
            )}
            <span className="node-arrow">
              <ArrowUpRight size={14} />
            </span>
          </span>
        </span>
        <strong>{data.person.name}</strong>
        <span className="person-years">{years(data.person, { compact: true })}</span>
      </button>
    </div>
  )
}
const nodeTypes = { person: PersonCard }
const edgeTypes = { partnership: PartnershipEdge, parentage: ParentageEdge, organic: OrganicEdge }
export function FamilyTree(props: {
  family: Family
  demo: boolean
  persistent?: boolean
  layoutVariant?: 'classic' | 'upward'
  viewer?: FamilyViewer
}) {
  return (
    <ReactFlowProvider>
      <TreeView {...props} />
    </ReactFlowProvider>
  )
}
function TreeView({
  family,
  demo,
  persistent = false,
  layoutVariant = 'classic',
  viewer,
}: {
  family: Family
  demo: boolean
  persistent?: boolean
  layoutVariant?: 'classic' | 'upward'
  viewer?: FamilyViewer
}) {
  const settings = useSiteSettings()
  const flow = useReactFlow<TreeNode>()
  const [treeStyle, setTreeStyle] = useTreeStyle()
  const organic = treeStyle === 'organic'
  const preview = layoutVariant === 'upward'
  const growsUpwards = preview || organic
  const [query, setQuery] = useState(''),
    [selected, setSelected] = useState<string | null>(null)
  const [focusedFamily, setFocusedFamily] = useState<FamilyFocus | null>(null)
  const [keyboardSelection, setKeyboardSelection] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [compactCanvas, setCompactCanvas] = useState(false)
  const [minimumZoom, setMinimumZoom] = useState(0.16)
  const [panEnabled, setPanEnabled] = useState(settings.options.mouseExploration),
    [speed, setSpeed] = useState<number>(
      MOUSE_AMPLITUDES[settings.options.mouseSpeed as keyof typeof MOUSE_AMPLITUDES],
    ),
    [help, setHelp] = useState(false),
    [zoom, setZoom] = useState(1)
  const canvasRef = useRef<HTMLDivElement>(null)
  const canvasSizeRef = useRef<{ width: number; height: number } | null>(null)
  const focusExitRef = useRef<HTMLButtonElement>(null)
  const focusPending = useRef(false)
  const instructionsId = useId()
  const panAnchor = useRef<ParallaxAnchor | null>(null),
    wheelUntil = useRef(0),
    pending = useRef<Point | null>(null),
    frame = useRef<number | null>(null)
  const basePlacements = useMemo(
    () =>
      organic
        ? layoutOrganicFamily(family)
        : preview
          ? layoutBranchingFamily(family)
          : layoutFamily(family),
    [family, organic, preview],
  )
  const placements = useMemo(
    () =>
      focusedFamily
        ? familyFocusPlacements(basePlacements, focusedFamily, growsUpwards)
        : basePlacements,
    [basePlacements, focusedFamily, growsUpwards],
  )
  const focusedIds = useMemo(
    () => new Set(focusedFamily ? [...focusedFamily.parentIds, ...focusedFamily.childIds] : []),
    [focusedFamily],
  )
  const generations =
    Math.max(0, ...placements.map((p) => p.generation)) + (family.people.length ? 1 : 0)
  const stopPan = useCallback(() => {
    panAnchor.current = null
    pending.current = null
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    canvasRef.current?.style.setProperty('--tree-drift-x', '0px')
    canvasRef.current?.style.setProperty('--tree-drift-y', '0px')
  }, [])
  const previousStyle = useRef(treeStyle)
  useEffect(() => {
    if (previousStyle.current === treeStyle) return
    previousStyle.current = treeStyle
    stopPan()
    focusPending.current = true
    let active = true
    const frame = requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas) {
        focusPending.current = false
        return
      }
      const size = { width: canvas.clientWidth, height: canvas.clientHeight }
      const person = placements.find((p) => p.id === selected)
      const viewport = focusedFamily
        ? familyFocusViewport(placements, focusedFamily, size)
        : person
          ? {
              x: size.width / 2 - (person.x + CARD_WIDTH / 2) * 0.85,
              y:
                size.height * (size.width < 600 ? 0.22 : 0.5) - (person.y + CARD_HEIGHT / 2) * 0.85,
              zoom: 0.85,
            }
          : growsUpwards
            ? stemViewport(family, placements, size)
            : null
      const update = viewport
        ? flow.setViewport(viewport, { duration: 350 })
        : flow.fitView({ padding: 0.17, minZoom: 0.16, maxZoom: 0.85, duration: 350 })
      void update.finally(() => {
        if (active) focusPending.current = false
      })
    })
    return () => {
      active = false
      cancelAnimationFrame(frame)
    }
  }, [treeStyle, placements, selected, focusedFamily, growsUpwards, family, flow, stopPan])
  const diagramBounds = useMemo(
    () => placementBounds(placements, growsUpwards ? UPWARD_BOTTOM_PADDING : 0),
    [placements, growsUpwards],
  )
  const navigationBounds = useMemo(() => placementBounds(placements), [placements])
  const translateExtent = useMemo(
    () =>
      canvasSize.width && canvasSize.height
        ? navigationExtent(navigationBounds, canvasSize, zoom)
        : undefined,
    [navigationBounds, canvasSize, zoom],
  )
  const focusStem = useCallback(
    (animate = true) => {
      focusPending.current = true
      setFocusedFamily(null)
      setSelected(null)
      stopPan()
      requestAnimationFrame(() => {
        const canvas = canvasRef.current
        if (!canvas) {
          focusPending.current = false
          return
        }
        void flow
          .setViewport(
            stemViewport(
              family,
              basePlacements,
              { width: canvas.clientWidth, height: canvas.clientHeight },
              placementBounds(basePlacements, UPWARD_BOTTOM_PADDING),
            ),
            { duration: animate ? 350 : 0 },
          )
          .finally(() => {
            focusPending.current = false
          })
      })
    },
    [flow, family, basePlacements, stopPan],
  )
  const focusFamily = useCallback(
    (group: FamilyFocus) => {
      stopPan()
      focusPending.current = true
      setFocusedFamily(group)
      setSelected(null)
      setQuery('')
      requestAnimationFrame(() => {
        const canvas = canvasRef.current
        if (!canvas) {
          focusPending.current = false
          return
        }
        void flow
          .setViewport(
            familyFocusViewport(familyFocusPlacements(basePlacements, group, growsUpwards), group, {
              width: canvas.clientWidth,
              height: canvas.clientHeight,
            }),
            { duration: 350 },
          )
          .finally(() => {
            focusPending.current = false
            focusExitRef.current?.focus({ preventScroll: true })
          })
      })
    },
    [basePlacements, flow, growsUpwards, stopPan],
  )
  const selectPerson = useCallback(
    (id: string, fromKeyboard = false) => {
      stopPan()
      setKeyboardSelection(fromKeyboard)
      if (id === selected) {
        if (focusedFamily) focusFamily(focusedFamily)
        else setSelected(null)
        return
      }
      focusPending.current = true
      setSelected(id)
      setQuery('')
      const p = placements.find((p) => p.id === id)
      if (p)
        requestAnimationFrame(() => {
          const canvas = canvasRef.current
          if (canvas) {
            const centerY =
              canvas.clientHeight * (window.matchMedia('(max-width:760px)').matches ? 0.22 : 0.5)
            void flow
              .setViewport(
                constrainViewport(
                  {
                    x: canvas.clientWidth / 2 - (p.x + CARD_WIDTH / 2),
                    y: centerY - (p.y + CARD_HEIGHT / 2),
                    zoom: 1,
                  },
                  diagramBounds,
                  {
                    width: canvas.clientWidth,
                    height:
                      canvas.clientHeight *
                      (window.matchMedia('(max-width:760px)').matches ? 0.45 : 1),
                  },
                ),
                { duration: fromKeyboard ? 120 : 350 },
              )
              .finally(() => {
                focusPending.current = false
              })
          } else focusPending.current = false
        })
    },
    [flow, placements, stopPan, diagramBounds, selected, focusedFamily, focusFamily],
  )
  const keepInBounds = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || focusPending.current) return
    stopPan()
    const size = {
      width: canvas.clientWidth,
      height:
        canvas.clientHeight *
        (selected && window.matchMedia('(max-width:760px)').matches ? 0.45 : 1),
    }
    void flow.setViewport(constrainViewport(flow.getViewport(), navigationBounds, size), {
      duration: 0,
    })
  }, [flow, navigationBounds, selected, stopPan])
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      setCompactCanvas(canvas.clientWidth < 600)
      const size = { width: canvas.clientWidth, height: canvas.clientHeight }
      const previous = canvasSizeRef.current
      canvasSizeRef.current = size
      if (previous?.width !== size.width || previous?.height !== size.height) setCanvasSize(size)
      // Re-subscribing after a focus change is not a resize. Preserve the camera.
      if (
        (previous?.width === size.width && previous.height === size.height) ||
        focusPending.current
      )
        return
      if (focusedFamily && !selected) {
        stopPan()
        void flow.setViewport(
          familyFocusViewport(placements, focusedFamily, {
            width: canvas.clientWidth,
            height: canvas.clientHeight,
          }),
          { duration: 0 },
        )
      } else keepInBounds()
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [keepInBounds, focusedFamily, selected, placements, flow, stopPan])
  async function zoomStep(direction: 'in' | 'out') {
    stopPan()
    if (direction === 'in') await flow.zoomIn({ duration: 180 })
    else await flow.zoomOut({ duration: 180 })
    keepInBounds()
  }
  const nodes: TreeNode[] = useMemo(
    () =>
      placements.map((p) => ({
        id: p.id,
        type: 'person',
        position: { x: p.x, y: p.y },
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        zIndex: focusedIds.has(p.id) ? 2 : 0,
        className: focusedFamily && !focusedIds.has(p.id) ? 'outside-family' : undefined,
        data: {
          person: family.people.find((person) => person.id === p.id)!,
          generation: p.generation,
          growsUpwards,
          active: p.id === selected,
          inFamily: focusedIds.has(p.id),
          outsideFamily: !!focusedFamily && !focusedIds.has(p.id),
          onSelect: selectPerson,
        },
      })),
    [placements, family.people, selected, selectPerson, growsUpwards, focusedIds, focusedFamily],
  )
  const junctions = useMemo(() => parentageJunctions(family, placements), [family, placements])
  const focusedPaths = useMemo(
    () =>
      focusedFamily
        ? familyFocusParentagePaths(family, placements, focusedFamily, growsUpwards)
        : new Map<string, string>(),
    [family, placements, focusedFamily, growsUpwards],
  )
  const routingFamily = useMemo<Family>(
    () =>
      focusedFamily
        ? {
            people: family.people.filter((person) => focusedIds.has(person.id)),
            parentages: family.parentages.filter(
              (relation) =>
                focusedFamily.parentIds.includes(relation.parent) &&
                focusedFamily.childIds.includes(relation.child),
            ),
            partnerships: family.partnerships.filter(
              (pair) =>
                focusedFamily.parentIds.includes(pair.personA) &&
                focusedFamily.parentIds.includes(pair.personB),
            ),
          }
        : family,
    [family, focusedFamily, focusedIds],
  )
  const routingPlacements = useMemo(
    () =>
      focusedFamily ? placements.filter((placement) => focusedIds.has(placement.id)) : placements,
    [placements, focusedFamily, focusedIds],
  )
  const {
    routes: organicRoutes,
    pending: routingPending,
    error: routingError,
    retry: retryRouting,
  } = useOrganicConnections(routingFamily, routingPlacements, organic)
  const legacyEdges: Edge[] = useMemo(
    () => [
      ...family.parentages.map((r) => ({
        id: `parent-${r.id}`,
        source: r.parent,
        target: r.child,
        sourceHandle: 'child',
        targetHandle: 'parent',
        type: 'parentage',
        data: {
          junction: organic && !focusedFamily ? undefined : junctions.get(r.id),
          path: focusedPaths.get(r.id),
          taper: organic,
        },
        style: {
          stroke: organic ? '#718d74' : '#8b9f91',
          strokeWidth: organic ? 2.2 : 1.6,
        },
        className:
          focusedFamily && !(focusedIds.has(r.parent) && focusedIds.has(r.child))
            ? 'outside-family'
            : undefined,
        pathOptions: growsUpwards ? { curvature: 0.28 } : { borderRadius: 16 },
      })),
      ...family.partnerships.map((r, index) => {
        let a = placements.find((p) => p.id === r.personA),
          b = placements.find((p) => p.id === r.personB)
        if (a && b && a.x > b.x) [a, b] = [b, a]
        return {
          id: `partner-${r.id}`,
          source: a?.id ?? r.personA,
          target: b?.id ?? r.personB,
          sourceHandle: 'partner-right',
          targetHandle: 'partner-left',
          type: 'partnership',
          className:
            focusedFamily && !(focusedIds.has(r.personA) && focusedIds.has(r.personB))
              ? 'outside-family'
              : undefined,
          data: { detour: !!(a && b && partnershipDetour(a, b)), lane: index % 3 },
          style: {
            stroke: '#b89868',
            strokeWidth: 1.8,
            strokeDasharray: r.status === 'ended' ? '4 4' : undefined,
          },
          pathOptions: { borderRadius: 12 },
        }
      }),
    ],
    [family, placements, growsUpwards, organic, junctions, focusedPaths, focusedFamily, focusedIds],
  )
  const edges: Edge[] = useMemo(() => {
    if (!organic) return legacyEdges
    const context = focusedFamily
      ? legacyEdges.filter((edge) => edge.className === 'outside-family')
      : []
    if (routingPending) return context
    if (!organicRoutes) return legacyEdges
    return [
      ...context,
      ...organicRoutes.map((route) => ({
        id: route.id,
        source: route.source,
        target: route.target,
        sourceHandle: route.kind === 'partnership' ? 'partner-right' : 'child',
        targetHandle: route.kind === 'partnership' ? 'partner-left' : 'parent',
        type: 'organic',
        data: route,
        style: {
          stroke: route.kind === 'partnership' ? '#b89868' : '#718d74',
          strokeWidth: 1.8,
          strokeDasharray: route.ended ? '4 4' : undefined,
        },
      })),
    ]
  }, [organic, legacyEdges, focusedFamily, routingPending, organicRoutes])
  const person = family.people.find((p) => p.id === selected)
  const results = useMemo(() => {
    const q = query
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('nl')
    return q
      ? family.people.filter((p) =>
          `${p.name} ${p.birthSurname ?? ''}`
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase('nl')
            .includes(q),
        )
      : []
  }, [family.people, query])
  const exitFamilyFocus = useCallback(() => {
    const viewport = flow.getViewport()
    stopPan()
    focusPending.current = true
    setMinimumZoom(Math.min(0.16, viewport.zoom))
    setFocusedFamily(null)
    setSelected(null)
    requestAnimationFrame(() => {
      // Restoring the original node positions must not refit or clamp the camera.
      void flow.setViewport(viewport, { duration: 0 }).finally(() => {
        requestAnimationFrame(() => {
          focusPending.current = false
          stopPan()
        })
      })
    })
  }, [flow, stopPan])
  const reset = useCallback(() => {
    stopPan()
    focusPending.current = true
    setMinimumZoom(0.16)
    setFocusedFamily(null)
    setSelected(null)
    requestAnimationFrame(() => {
      void flow.fitView({ padding: 0.17, maxZoom: 1, duration: 350 }).finally(() => {
        focusPending.current = false
      })
    })
  }, [flow, stopPan])
  useEffect(() => {
    if (!keyboardSelection || !selected) return
    const frame = requestAnimationFrame(() => {
      canvasRef.current
        ?.querySelector<HTMLButtonElement>(`[data-person-id="${CSS.escape(selected)}"]`)
        ?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [keyboardSelection, selected])
  function treeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const target = event.target
    if (
      !(target instanceof HTMLElement) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      help ||
      target.closest(
        'input,textarea,select,[contenteditable="true"],[role="textbox"],[data-pan-exempt],.react-flow__minimap',
      )
    )
      return
    if (!target.closest('.canvas,.detail-panel')) return
    const canvas = canvasRef.current
    if (!canvas) return
    if (isArrowKey(event.key)) {
      event.preventDefault()
      event.stopPropagation()
      stopPan()
      if (selected) {
        const next = relatedPerson(
          family,
          placements,
          selected,
          event.key,
          focusedFamily ? focusedIds : undefined,
          !!focusedFamily,
        )
        if (next) selectPerson(next, true)
      } else {
        void flow.setViewport(
          constrainViewport(
            keyboardViewport(flow.getViewport(), event.key, event.shiftKey),
            navigationBounds,
            { width: canvas.clientWidth, height: canvas.clientHeight },
          ),
          { duration: 0 },
        )
      }
    } else if (event.key === 'Enter' && !selected && target === canvas) {
      event.preventDefault()
      const next = nearestPerson(
        placements,
        flow.getViewport(),
        { width: canvas.clientWidth, height: canvas.clientHeight },
        focusedFamily ? focusedIds : undefined,
      )
      if (next) selectPerson(next, true)
    }
  }
  useEffect(() => () => stopPan(), [stopPan])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (focusedFamily && !selected && !help) exitFamilyFocus()
        else if (focusedFamily && selected && !help) focusFamily(focusedFamily)
        setSelected(null)
        setHelp(false)
        stopPan()
        if (!help) canvasRef.current?.focus({ preventScroll: true })
      }
      if (
        event.code === 'Space' &&
        !(
          event.target instanceof HTMLElement &&
          event.target.closest('input,select,textarea,button,a')
        )
      ) {
        event.preventDefault()
        setPanEnabled((value) => !value)
        stopPan()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [stopPan, exitFamilyFocus, focusedFamily, selected, help, focusFamily])
  return (
    <main
      className={`app-shell ${growsUpwards ? 'upward-preview' : ''} ${organic ? 'organic-tree' : ''}`}
    >
      <aside className="sidebar">
        <FamilyBrand />
        <SidebarHeading module="tree" demo={demo} />
        <div className="search-area">
          <label htmlFor="person-search">Wie zoek je?</label>
          <div className="search-field">
            <Search size={17} />
            <input
              id="person-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek een naam…"
              autoComplete="off"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Zoekopdracht wissen">
                <X size={15} />
              </button>
            )}
          </div>
          {query.trim() && (
            <div className="search-results" aria-live="polite">
              <p>
                {results.length
                  ? `${results.length} ${results.length === 1 ? 'persoon' : 'personen'} gevonden`
                  : 'Geen personen gevonden'}
              </p>
              {results.map((p) => (
                <button key={p.id} onClick={() => selectPerson(p.id)}>
                  <PersonAvatar person={p} className="mini-avatar" />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{years(p, { compact: true })}</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          )}
        </div>
        {settings.options.statistics && (
          <div className="family-summary">
            <span className="eyebrow">{siteText(settings.shared.statisticsTitle, settings)}</span>
            <div className="stats">
              <div>
                <strong>{family.people.length}</strong>
                <span>personen</span>
              </div>
              <div>
                <strong>{generations}</strong>
                <span>generaties</span>
              </div>
              <GitBranch size={35} strokeWidth={1} />
            </div>
          </div>
        )}
        <div className="sidebar-bottom">
          <div className="little-note">
            <Leaf size={22} strokeWidth={1.4} />
            <p>{siteText(settings.shared.sidebarNote, settings)}</p>
          </div>
          {viewer !== 'family' && (
            <Link className="admin-link" href="/admin">
              <Settings2 size={16} /> {siteText(settings.shared.manageLabel, settings)}{' '}
              <ArrowUpRight size={15} />
            </Link>
          )}
          <FamilyAccountControls viewer={viewer} />
          <span className="privacy-note">
            <ShieldCheck size={13} />
            {demo
              ? 'Uitsluitend fictieve voorbeelden'
              : siteText(settings.shared.privacyNote, settings)}
          </span>
        </div>
      </aside>
      <section className="workspace" aria-label="Interactieve stamboom">
        <WorkspaceHeader
          title="De stamboom"
          active="tree"
          treeHref={persistent ? '/' : preview ? '/voorvertoning' : '/voorbeeld'}
          mapHref={persistent ? '/kaart' : preview ? '/voorvertoning/kaart' : '/voorbeeld/kaart'}
        >
          <span className="mode-badge">
            <span />
            {preview
              ? 'Ontwerpvoorstel'
              : demo
                ? persistent
                  ? 'Opgeslagen proefstamboom'
                  : 'Voorbeeldmodus'
                : 'Opgeslagen stamboom'}
          </span>
          <button
            className="icon-button help-button"
            onClick={() => setHelp(!help)}
            aria-expanded={help}
            aria-label="Uitleg over de bediening"
          >
            <CircleHelp size={20} />
          </button>
        </WorkspaceHeader>
        {demo && (
          <div className="demo-banner">
            <span className="demo-symbol">
              <Leaf size={15} />
            </span>
            <p>
              <strong>{preview ? 'Een nieuwe indeling.' : 'Een eerste kennismaking.'}</strong>{' '}
              {preview
                ? 'De stam staat onderaan, de takken groeien omhoog. Alle personen zijn fictief.'
                : 'Alle personen en familiebanden hieronder zijn fictief.'}
            </p>
            <span className="desktop-only">
              {preview ? <Link href="/">Huidige versie →</Link> : 'Voorbeeldstamboom'}
            </span>
          </div>
        )}
        <CompactToolbar label="Stamboomopties">
          <div className="tree-layout-toolbar">
            <span>Indeling van de stamboom</span>
            <div className="tree-style-toggle" role="group" aria-label="Indeling van de stamboom">
              <button
                type="button"
                aria-pressed={!organic}
                onClick={() => setTreeStyle('structured')}
              >
                <Network size={15} /> Overzichtelijk
              </button>
              <button type="button" aria-pressed={organic} onClick={() => setTreeStyle('organic')}>
                <TreeDeciduous size={15} /> Vrije boom
              </button>
            </div>
          </div>
          <button className="mobile-help-button" onClick={() => setHelp(true)}>
            <CircleHelp size={16} /> Uitleg over de bediening
          </button>
        </CompactToolbar>
        <div
          className={`tree-stage ${person ? 'has-detail' : ''} ${focusedFamily ? 'has-family-focus' : ''}`}
          onKeyDown={treeKeyDown}
        >
          <p id={instructionsId} className="sr-only">
            Pijltjestoetsen verplaatsen het veld. Shift verplaatst sneller. Enter selecteert de
            dichtstbijzijnde persoon. Bij selectie: omhoog naar een ouder, omlaag naar een kind,
            links en rechts naar broers, zussen of partners. Escape sluit de selectie.
          </p>
          <div
            ref={canvasRef}
            className="canvas"
            data-testid="tree-canvas"
            tabIndex={0}
            role="region"
            aria-label="Stamboom verkennen"
            aria-describedby={instructionsId}
            onPointerMoveCapture={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const next = parallaxOffset(
                panAnchor.current,
                {
                  point: { x: e.clientX - rect.left, y: e.clientY - rect.top },
                  pointerType: e.pointerType,
                  buttons: e.buttons,
                  enabled: panEnabled && !selected && !focusedFamily && !focusPending.current,
                  exempt:
                    e.target instanceof Element &&
                    !!e.target.closest('[data-pan-exempt],.react-flow__minimap'),
                  now: performance.now(),
                  wheelUntil: wheelUntil.current,
                },
                {
                  width: rect.width,
                  height:
                    rect.height *
                    (person && window.matchMedia('(max-width:760px)').matches ? 0.45 : 1),
                },
                speed,
              )
              panAnchor.current = next.anchor
              if (!next.anchor) {
                stopPan()
                return
              }
              pending.current = next.offset
              if (frame.current === null)
                frame.current = requestAnimationFrame(() => {
                  frame.current = null
                  const target = pending.current
                  pending.current = null
                  if (target) {
                    canvasRef.current?.style.setProperty('--tree-drift-x', `${target.x}px`)
                    canvasRef.current?.style.setProperty('--tree-drift-y', `${target.y}px`)
                  }
                })
            }}
            onPointerLeave={stopPan}
            onPointerDownCapture={(event) => {
              stopPan()
              if (
                event.target instanceof Element &&
                !event.target.closest('button,input,select,a,[data-pan-exempt]')
              )
                event.currentTarget.focus({ preventScroll: true })
            }}
            onWheelCapture={() => {
              stopPan()
              wheelUntil.current = performance.now() + 250
            }}
          >
            {(routingPending || routingError) && (
              <div className="organic-routing-status" role="status">
                {routingPending ? (
                  <>
                    <LoaderCircle size={14} aria-hidden="true" /> Verbindingen worden gelegd…
                  </>
                ) : (
                  <>
                    Verbindingen konden niet worden geordend.{' '}
                    <button onClick={retryRouting}>Opnieuw proberen</button>
                  </>
                )}
              </div>
            )}
            <ReactFlow<TreeNode>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodeClick={(_, node) => selectPerson(node.id)}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              edgesFocusable={false}
              nodesFocusable={false}
              panOnDrag
              translateExtent={translateExtent}
              panActivationKeyCode={null}
              zoomOnScroll={false}
              panOnScroll
              zoomOnPinch
              preventScrolling
              minZoom={focusedFamily ? 0.04 : minimumZoom}
              maxZoom={1.65}
              fitView={!growsUpwards}
              onInit={growsUpwards ? () => focusStem(false) : undefined}
              fitViewOptions={{ padding: 0.12, minZoom: 0.65, maxZoom: 1 }}
              onMove={(_, v) => setZoom(v.zoom)}
              onMoveStart={(event) => {
                if (event) stopPan()
              }}
              deleteKeyCode={null}
              aria-label="Stamboomschema met personen en familieverbindingen"
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#d9dfd5" />
              {!!placements.length && settings.options.minimap && (
                <MiniMap<TreeNode>
                  className="tree-minimap"
                  position="bottom-right"
                  style={{ width: compactCanvas ? 120 : 176, height: compactCanvas ? 78 : 108 }}
                  ariaLabel="Minimap van de volledige stamboom; het kader toont waar je bent"
                  pannable
                  zoomable
                  nodeColor={(node) =>
                    focusedIds.has(node.id)
                      ? settings.appearance.green
                      : node.id === selected
                        ? settings.appearance.accent
                        : '#bdcbb5'
                  }
                  nodeStrokeColor={(node) =>
                    focusedIds.has(node.id) || node.id === selected
                      ? settings.appearance.ink
                      : '#91a186'
                  }
                  nodeBorderRadius={5}
                  maskColor="rgba(235, 240, 229, 0.65)"
                  maskStrokeColor="#6f8562"
                  maskStrokeWidth={2}
                />
              )}
            </ReactFlow>
            {focusedFamily ? (
              <section className="family-focus-banner" data-pan-exempt aria-label="Gezin in focus">
                <div>
                  <Focus size={17} />
                  <span>
                    <strong>{focusedFamily.label}</strong>
                    <small>
                      {focusedFamily.childIds.length}{' '}
                      {focusedFamily.childIds.length === 1 ? 'kind' : 'kinderen'} · gezin in focus
                    </small>
                  </span>
                </div>
                <button ref={focusExitRef} onClick={exitFamilyFocus}>
                  <X size={14} /> Focus sluiten
                </button>
              </section>
            ) : (
              <div className="canvas-label" data-pan-exempt>
                <span className="status-dot" /> {generations} generaties in verbinding
              </div>
            )}
            {!family.people.length && (
              <div className="empty-tree">
                <Users size={40} />
                <h3>Het eerste hoofdstuk begint hier</h3>
                <p>Voeg in het beheer een persoon toe. Het schema groeit vanzelf mee.</p>
                {viewer !== 'family' && <Link href="/admin">Eerste persoon toevoegen →</Link>}
              </div>
            )}
            {growsUpwards && placements.length > 0 && (
              <button
                className="stem-control"
                data-pan-exempt
                onClick={() => focusStem()}
                aria-label="Naar de stamgeneratie"
              >
                <GitBranch size={14} /> Naar de stam
              </button>
            )}
            <div className="map-controls" data-pan-exempt>
              <button
                onClick={() => {
                  void zoomStep('out')
                }}
                aria-label="Uitzoomen"
              >
                <Minus size={17} />
              </button>
              <span aria-label="Zoomniveau">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => {
                  void zoomStep('in')
                }}
                aria-label="Inzoomen"
              >
                <Plus size={17} />
              </button>
              <i />
              <button
                onClick={reset}
                aria-label="Hele stamboom in beeld"
                title="Hele stamboom in beeld"
              >
                <Maximize size={17} />
              </button>
            </div>
            <div className="pan-controls" data-pan-exempt>
              <button
                onClick={() => {
                  stopPan()
                  setPanEnabled((v) => !v)
                }}
                disabled={!!selected || !!focusedFamily}
                aria-pressed={panEnabled && !selected && !focusedFamily}
                aria-label={
                  focusedFamily
                    ? 'Muisbeweging gepauzeerd tijdens gezinsfocus'
                    : selected
                      ? 'Muisbeweging gepauzeerd tijdens selectie'
                      : panEnabled
                        ? 'Muisbeweging pauzeren'
                        : 'Muisbeweging hervatten'
                }
              >
                {panEnabled && !selected && !focusedFamily ? (
                  <Pause size={13} />
                ) : (
                  <Play size={13} />
                )}
                <span>
                  {focusedFamily
                    ? 'Gezin in focus'
                    : selected
                      ? 'Gepauzeerd bij selectie'
                      : panEnabled
                        ? 'Subtiele muisbeweging'
                        : 'Muis gepauzeerd'}
                </span>
              </button>
              <select
                aria-label="Sterkte van muisbeweging"
                value={speed}
                onChange={(e) => {
                  stopPan()
                  setSpeed(Number(e.target.value))
                }}
              >
                <option value={MOUSE_AMPLITUDES.slow}>Zeer subtiel</option>
                <option value={MOUSE_AMPLITUDES.normal}>Subtiel</option>
                <option value={MOUSE_AMPLITUDES.fast}>Meer beweging</option>
              </select>
            </div>
          </div>
          {help && (
            <section className="help-panel" aria-label="Bediening">
              <button
                className="close-button"
                onClick={() => setHelp(false)}
                aria-label="Uitleg sluiten"
              >
                <X size={18} />
              </button>
              <MousePointer2 size={23} />
              <h3>Op je eigen tempo ontdekken</h3>
              <p>
                <strong>Met de muis:</strong> klik en sleep om de stamboom te verplaatsen. Je kunt
                de boom tot net buiten beeld schuiven; de overzichtsknop haalt hem terug. Losse
                muisbeweging geeft alleen een subtiel diepte-effect van enkele pixels.
              </p>
              <p>
                <strong>Met het toetsenbord:</strong> klik op het veld of bereik het met Tab.
                Gebruik de pijltjestoetsen om te verplaatsen, met Shift voor grotere stappen. Enter
                selecteert de dichtstbijzijnde persoon. Bij een geselecteerde persoon ga je omhoog
                naar een ouder, omlaag naar een kind en links of rechts naar broers, zussen of
                partners. Dit volgt de familiebanden in beide indelingen. Escape sluit de selectie.
              </p>
              <p>
                Klik op een naam voor meer informatie. Zolang een kaart geselecteerd is, volgt het
                schema je muis niet. Klik nogmaals op die kaart om de selectie te sluiten en verder
                te verkennen. Je kunt ook pauzeren met de pauzeknop of de spatiebalk.
              </p>
              <p>
                <strong>Op je telefoon:</strong> veeg met één vinger en knijp met twee vingers om te
                zoomen. Op een trackpad kun je met twee vingers schuiven of knijpen.
              </p>
              <p>
                <strong>Indeling:</strong> kies Overzichtelijk voor vaste generatierijen of Vrije
                boom voor opwaartse, verspringende takken. Je keuze blijft in deze browser bewaard.
                Gezin in beeld houdt in beide standen maximaal vier kaarten per rij.
              </p>
              <p>
                Gebruik de zoomknoppen en <Maximize size={13} /> om het overzicht terug te halen.
              </p>
            </section>
          )}
          {person && (
            <PersonDetail
              key={person.id}
              person={person}
              family={family}
              demo={demo}
              onSelect={selectPerson}
              focusOnOpen={!keyboardSelection}
              eventsBase={persistent ? '/' : preview ? '/voorvertoning' : '/voorbeeld'}
              onFocusFamily={focusFamily}
              onClose={() => {
                if (focusedFamily) focusFamily(focusedFamily)
                else {
                  setSelected(null)
                  stopPan()
                }
              }}
            />
          )}
        </div>
        <footer className="workspace-footer">
          <div className="legend">
            <span>
              <i className="parent-line" /> Ouder & kind
            </span>
            <span>
              <i className="partner-line" /> Partnerschap
            </span>
          </div>
          <span className="desktop-instruction">
            <MousePointer2 size={13} /> Sleep of gebruik de pijltjestoetsen · klik op een naam
          </span>
          <span className="touch-instruction">Veeg om te verplaatsen · knijp om te zoomen</span>
        </footer>
      </section>
    </main>
  )
}
export function PersonDetail({
  person,
  family,
  demo,
  onSelect,
  onClose,
  onFocusFamily,
  focusOnOpen = true,
  eventsBase = '/',
  onEventSelect,
}: {
  person: Person
  family: Family
  demo: boolean
  onSelect: (id: string) => void
  onClose: () => void
  onEventSelect?: (id: string) => void
  eventsBase?: string
  onFocusFamily?: (group: FamilyFocus) => void
  focusOnOpen?: boolean
}) {
  const settings = useSiteSettings()
  const headingRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (focusOnOpen) headingRef.current?.focus({ preventScroll: true })
  }, [focusOnOpen])
  const parents = family.parentages.filter((r) => r.child === person.id).map((r) => r.parent)
  const children = family.parentages
    .filter((r) => r.parent === person.id)
    .map((r) => r.child)
    .sort(childOrder(family, [person.id]))
  const partners = family.partnerships.filter(
    (r) => r.personA === person.id || r.personB === person.id,
  )
  const siblings = [
    ...new Set(
      family.parentages
        .filter((r) => parents.includes(r.parent) && r.child !== person.id)
        .map((r) => r.child),
    ),
  ]
  siblings.sort(childOrder(family, parents))
  const personEvents = settings.pages.events.enabled
    ? eventsForPerson(family.events, person.id)
    : []
  const a = age(person)
  const focusOptions = onFocusFamily ? familyFocusOptions(family, person.id) : []
  function relative(id: string, note?: string) {
    const p = family.people.find((p) => p.id === id)
    if (!p) return null
    return (
      <button key={id} className="relative" onClick={() => onSelect(id)}>
        <PersonAvatar person={p} className="mini-avatar" />
        <span>
          <strong>{p.name}</strong>
          <small>{note ?? years(p, { compact: true })}</small>
        </span>
        <ChevronRight size={16} />
      </button>
    )
  }
  return (
    <aside className="detail-panel" aria-label={`Gegevens van ${person.name}`}>
      <div className="detail-top">
        <span className="eyebrow">{siteText(settings.shared.personTitle, settings)}</span>
        <button
          ref={headingRef}
          onClick={onClose}
          className="icon-button"
          aria-label="Persoonsgegevens sluiten"
        >
          <X size={20} />
        </button>
      </div>
      <div className="detail-scroll">
        {!!focusOptions.length && (
          <section className="family-focus-options" aria-label="Gezin bekijken">
            {focusOptions.map((group) => (
              <button
                key={group.id}
                onClick={() => onFocusFamily?.(group)}
                aria-label={`Gezin van ${group.label} in beeld`}
              >
                <Focus size={17} />
                <span>
                  <strong>{group.origin ? 'Gezin van ouders in beeld' : 'Gezin in beeld'}</strong>
                  <small>
                    {group.label} · {group.childIds.length}{' '}
                    {group.childIds.length === 1 ? 'kind' : 'kinderen'}
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </section>
        )}
        <PersonPortrait person={person} />
        <PersonAvatar person={person} className="profile-avatar" />
        <div className="profile-heading">
          <h2>{person.name}</h2>
          <LifeStatusIcon status={person.lifeStatus} interactive />
        </div>
        {person.birthSurname && (
          <p>
            <span className="detail-label">Achternaam bij geboorte</span> {person.birthSurname}
          </p>
        )}
        {person.currentResidence && (
          <p>
            <span className="detail-label">Huidige woonplaats</span> {person.currentResidence}
          </p>
        )}
        <p className="profile-years">
          {years(person, { compact: true })}
          {a && <span>{a}</span>}
        </p>
        {(demo || person.isExample) && (
          <span className="fiction-label">
            <Check size={12} /> Fictieve voorbeeldpersoon
          </span>
        )}
        <div className="life-events">
          <div>
            <span className="event-icon">
              <Plus size={16} />
            </span>
            <div>
              <span className="detail-label">Geboren</span>
              <strong>{formatDate(person.birth)}</strong>
              <p>{person.birthPlace || 'Plaats onbekend'}</p>
            </div>
          </div>
          {person.lifeStatus === 'deceased' && (
            <div>
              <span className="event-icon">
                <Leaf size={16} />
              </span>
              <div>
                <span className="detail-label">Overlijdensdatum</span>
                <strong>{formatDate(person.death)}</strong>
              </div>
            </div>
          )}
        </div>
        {!!personEvents.length && (
          <section className="relatives-section person-events">
            <h3>
              <BookOpen size={15} />
              Gebeurtenissen <span>{personEvents.length}</span>
            </h3>
            {personEvents.map((event) => (
              <Link
                className="relative"
                href={eventHref(eventsBase, event.id)}
                onClick={
                  onEventSelect
                    ? (e) => {
                        e.preventDefault()
                        onEventSelect(event.id)
                      }
                    : undefined
                }
                key={event.id}
              >
                <span className="person-event-icon">
                  <BookOpen size={17} />
                </span>
                <span>
                  <strong>{event.title}</strong>
                  <small>{formatDate(event.date)}</small>
                </span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </section>
        )}
        {!!parents.length && (
          <div className="relatives-section">
            <h3>
              <ArrowUpRight size={15} /> Ouders <span>{parents.length}</span>
            </h3>
            {parents.map((id) => relative(id))}
          </div>
        )}
        <div className="relatives-section">
          <h3>
            <Heart size={14} /> Partnerschappen <span>{partners.length}</span>
          </h3>
          {partners.length ? (
            partners.map((r) =>
              relative(
                r.personA === person.id ? r.personB : r.personA,
                r.status === 'ended'
                  ? 'Beëindigd partnerschap'
                  : r.status === 'current'
                    ? 'Huidig partnerschap'
                    : 'Relatiestatus onbekend',
              ),
            )
          ) : (
            <p className="unknown-note">Nog geen partners vastgelegd.</p>
          )}
        </div>
        {!!children.length && (
          <div className="relatives-section">
            <h3>
              <ArrowDown size={15} /> Kinderen <span>{children.length}</span>
            </h3>
            {children.map((id) => relative(id))}
          </div>
        )}
        {!!siblings.length && (
          <div className="relatives-section">
            <h3>
              <Users size={15} /> Broers & zussen <span>{siblings.length}</span>
            </h3>
            <p className="unknown-note">
              Dezelfde vastgelegde ouder, inclusief halfbroers en halfzussen.
            </p>
            {siblings.map((id) => relative(id))}
          </div>
        )}
        <button className="back-to-tree" onClick={onClose}>
          <ArrowLeft size={15} /> Terug naar het overzicht
        </button>
      </div>
    </aside>
  )
}
