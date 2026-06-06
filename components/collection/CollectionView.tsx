'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { MdIcon } from '@/components/ui/MdIcon'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from '@/components/ui/popover'
import { RadialTree } from '@/components/collection/RadialTree'
import { cn } from '@/lib/utils'
import { langPrefix } from '@/lib/utils/i18n'
import type { Kingdom } from '@/lib/models/Species'

// ── Tunables ─────────────────────────────────────────────────────────────────
// Hover: how many neighbours are affected (1 = immediate neighbour only)
// and the peak scale factor of the hovered card.
const HOVER_SPREAD = 1
const HOVER_SCALE  = 1.2

// Card aspect ratio (H / W). 4/3 = 3:4 portrait.
const CARD_RATIO = 4 / 3

// Layout thresholds — `compact` is true when the ring area is narrower
// than this. Controls gap, margin, bottom padding, and zoom behaviour.
const COMPACT_BREAKPOINT = 500

// Gap between neighbouring card edges on the ring (px).
const GAP    = { compact: 16, wide: 32 } as const
// Margin inset for computing natural card size (px).
const MARGIN = { compact: 32, wide: 64 } as const
// Bottom padding: ring shrinks by half and shifts up by half so the top
// edge stays put and freed space appears only at the bottom.
const RING_BOTTOM_PAD = { compact: 16, wide: 32 } as const

// Zoomed-in centre offset: fraction of cy to shift the focused card
// above true centre, leaving room for the caption bar below.
const ZOOMED_CENTER_RATIO = 0.9

// Swipe: minimum horizontal distance (px) to register as a swipe.
const SWIPE_THRESHOLD = 40

const kingdoms: Kingdom[] = ['Animalia', 'Plantae', 'Fungi', 'Protista', 'Monera']

/** Hit-test the element stack at (clientX, clientY) for a card or tree node. */
function hitTestTarget(clientX: number, clientY: number): { type: 'card'; index: number } | { type: 'node'; id: string } | null {
  const elements = document.elementsFromPoint(clientX, clientY)
  for (const el of elements) {
    const ci = (el as HTMLElement).dataset?.cardIndex
    if (ci !== undefined) return { type: 'card', index: Number(ci) }
    const ni = (el as SVGElement).dataset?.nodeId
    if (ni !== undefined) return { type: 'node', id: ni }
  }
  return null
}

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Shortest angular distance (wrapping), result in [-max/2, max/2]. */
const shortestAngle = (a0: number, a1: number, max = Math.PI * 2) => {
  const da = (a1 - a0) % max
  return 2 * da % max - da
}
/** Wrap value into [0, max). */
const wrapValue = (value: number, max: number) => {
  let v = value
  while (v < 0) v += max
  return v % max
}

// ── Types ────────────────────────────────────────────────────────────────────
/** Slim serialisable data the circle view needs per card. */
export interface CircleCardData {
  id: string
  photoUrl: string | undefined
  displayName: string
  href: string
  // Taxonomy fields for tree visualisation (English — grouping key)
  kingdom: Kingdom
  phylum: string
  taxonomyClass: string
  order: string
  family: string
  genus: string
  species: string
  // zh taxonomy display names (optional — only present on zh locale)
  kingdomZh?: string
  phylumZh?: string
  taxonomyClassZh?: string
  orderZh?: string
  familyZh?: string
  genusZh?: string
}

export type SortOption = 'name' | 'date' | 'kingdom'

interface CollectionViewProps {
  /** Plain-object card data for the circle layout (serialisable across the server boundary). */
  circleData: CircleCardData[]
  /** Active kingdom filters — highlights matching nodes in the tree instead of hiding cards. */
  activeKingdoms: Kingdom[]
  /** Active view from URL. */
  activeView: 'grid' | 'circle'
  /** Active sort option. */
  activeSort: SortOption
  /** Localised taxonomy rank labels (phylum, class, etc.) for the tree hover label. */
  rankLabels: Record<string, string>
  /** Localised labels */
  sortByLabel: string
  sortLabels: Record<SortOption, string>
  filterLabel: string
  filterByKingdomLabel: string
  clearAllLabel: string
  switchViewLabel: string
  exitFullscreenLabel: string
  circleUnavailableLabel: string
  circleUnavailableHint: string
  kingdomLabels: Record<string, string>
  kingdomsLabel: string
  lang: string
  /** Server-rendered grid markup passed as children — rendered as-is in grid mode. */
  children: React.ReactNode
}

// ── Component ────────────────────────────────────────────────────────────────
export function CollectionView({
  circleData,
  activeKingdoms,
  activeView,
  activeSort,
  rankLabels,
  sortByLabel,
  sortLabels,
  filterLabel,
  filterByKingdomLabel,
  clearAllLabel,
  switchViewLabel,
  exitFullscreenLabel,
  circleUnavailableLabel,
  circleUnavailableHint,
  kingdomLabels,
  kingdomsLabel,
  lang,
  children,
}: CollectionViewProps) {
  const router = useRouter()
  const prefix = langPrefix(lang)
  const base = prefix || '/'

  const [view, setView] = useState<'grid' | 'circle'>(activeView)
  const isEmpty = circleData.length === 0
  const canCircle = circleData.length >= 5

  // Only show kingdoms that have at least one recording
  const presentKingdoms = useMemo(() => {
    const set = new Set(circleData.map((c) => c.kingdom))
    return kingdoms.filter((k) => set.has(k))
  }, [circleData])
  const hasFilter = activeKingdoms.length > 0

  // ── URL builder — preserves sort, kingdom, and view params ─────────────────
  function buildUrl(sort: SortOption, kingdoms: Kingdom[], v: 'grid' | 'circle' = view) {
    const params = new URLSearchParams()
    if (sort !== 'kingdom') params.set('sort', sort)
    if (kingdoms.length > 0) params.set('kingdom', kingdoms.join(','))
    if (v === 'circle') params.set('view', 'circle')
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  }

  // ── Sort navigation ────────────────────────────────────────────────────────
  function selectSort(s: SortOption) {
    router.push(buildUrl(s, activeKingdoms))
  }

  // ── Kingdom filter navigation (multi-select) ───────────────────────────────
  function toggleKingdom(k: Kingdom) {
    const next = activeKingdoms.includes(k)
      ? activeKingdoms.filter((x) => x !== k)
      : [...activeKingdoms, k]
    router.push(buildUrl(activeSort, next))
  }

  function clearKingdoms() {
    router.push(buildUrl(activeSort, []))
  }

  // ── Interaction state ──────────────────────────────────────────────────────
  const [hovered, setHovered] = useState<number | null>(null)
  const [zoomed, setZoomed] = useState(false)
  const [idx, setIdx] = useState(0)

  const resetZoom = useCallback(() => {
    setZoomed(false)
    setHovered(null)
    setIdx(0)
  }, [])

  // Debounce card hover / touch-peek so the tree highlight stays stable.
  const peekLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCardEnter = useCallback((i: number) => {
    if (peekLeaveTimer.current) { clearTimeout(peekLeaveTimer.current); peekLeaveTimer.current = null }
    setHovered(i)
  }, [])
  const handleCardLeave = useCallback(() => {
    peekLeaveTimer.current = setTimeout(() => {
      setHovered(null)
      peekLeaveTimer.current = null
    }, 150)
  }, [])

  // ── Unified mobile long-press peek (cards + tree nodes) ─────────────────
  // One system at the container level: long-press to peek, drag across cards
  // and tree nodes seamlessly, tap to zoom / pin.
  const [peekedNodeId, setPeekedNodeId] = useState<string | null>(null)
  const peekingRef = useRef(false)
  const suppressClickRef = useRef(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Dedup: skip state updates when the drag target hasn't changed.
  const lastPeekTarget = useRef<string | null>(null)
  const LONG_PRESS_MS = 300

  /** Apply a hit-test result: set the matching hover/peek state, clear the other. */
  const applyPeekTarget = useCallback((target: ReturnType<typeof hitTestTarget>) => {
    const key = target ? `${target.type}:${'index' in target ? target.index : target.id}` : null
    if (key === lastPeekTarget.current) return           // dedup — same target
    lastPeekTarget.current = key
    if (peekLeaveTimer.current) { clearTimeout(peekLeaveTimer.current); peekLeaveTimer.current = null }
    if (target?.type === 'card')      { setHovered(target.index); setPeekedNodeId(null) }
    else if (target?.type === 'node') { setPeekedNodeId(target.id); setHovered(null) }
    else {
      peekLeaveTimer.current = setTimeout(() => {
        setHovered(null)
        setPeekedNodeId(null)
        lastPeekTarget.current = null
        peekLeaveTimer.current = null
      }, 300)
    }
  }, [])

  const handleRingPointerDown = useCallback((e: React.PointerEvent) => {
    // Swipe handler (zoomed mode)
    if (zoomed && e.pointerType === 'touch') {
      swipeRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    }
    if (e.pointerType !== 'touch' || zoomed) return

    suppressClickRef.current = false
    const target = hitTestTarget(e.clientX, e.clientY)
    if (!target) return

    // Start long-press timer → enters peek mode after delay
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      peekingRef.current = true
      suppressClickRef.current = true
      lastPeekTarget.current = null               // force first applyPeekTarget through
      applyPeekTarget(target)
      longPressTimer.current = null
    }, LONG_PRESS_MS)
  }, [zoomed, applyPeekTarget])

  const handleRingPointerUp = useCallback((e: React.PointerEvent) => {
    // Swipe handler (zoomed mode)
    const start = swipeRef.current
    if (start && start.id === e.pointerId) {
      swipeRef.current = null
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        e.stopPropagation()
        setIdx(prev => prev + (dx < 0 ? 1 : -1))
      }
    }
    if (e.pointerType !== 'touch') return
    // Cancel pending long-press if finger lifted early
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
    if (!peekingRef.current) return
    peekingRef.current = false
    lastPeekTarget.current = null
    // Debounced clear both hover + peeked node
    if (peekLeaveTimer.current) clearTimeout(peekLeaveTimer.current)
    peekLeaveTimer.current = setTimeout(() => {
      setHovered(null)
      setPeekedNodeId(null)
      peekLeaveTimer.current = null
    }, 300)
  }, [])

  // Drag-to-switch: find card or tree node under finger
  const handleRingPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'touch' || !peekingRef.current) return
    applyPeekTarget(hitTestTarget(e.clientX, e.clientY))
  }, [applyPeekTarget])

  // ── Measure the flex-1 ring area so geometry reacts to the actual space ─────
  const ringAreaRef = useRef<HTMLDivElement>(null)
  const [ringArea, setRingArea] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ringAreaRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setRingArea({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [view])

  // ── Circle geometry ────────────────────────────────────────────────────────
  const count = circleData.length

  // Square canvas: fit within whatever space flex gives the ring area.
  const containerSize = Math.min(ringArea.w, ringArea.h)

  const compact    = ringArea.w < COMPACT_BREAKPOINT
  const gap        = compact ? GAP.compact        : GAP.wide
  const margin     = compact ? MARGIN.compact      : MARGIN.wide
  const bottomPad  = compact ? RING_BOTTOM_PAD.compact : RING_BOTTOM_PAD.wide

  // Natural card size — largest portrait card that could fill the container.
  // The ring is built at this natural size, then scaled down.
  const naturalW = Math.max(1, Math.min(
    containerSize - gap * 2,
    (containerSize - margin * 2) / CARD_RATIO,
  ))
  const naturalH = naturalW * CARD_RATIO

  // Ring geometry at natural (1:1) scale — reference formulas.
  const angleStep    = (2 * Math.PI) / count
  const innerRadius  = ((naturalW + gap) / 2) / Math.tan(angleStep / 2)
  const centerRadius = innerRadius + naturalH / 2
  const outerRadius  = innerRadius + Math.sqrt((naturalW / 2) ** 2 + naturalH ** 2)

  // Scale the entire ring to fit the container (with bottom padding).
  const zoomedOutRadius = containerSize / 2 - bottomPad / 2
  // Zoomed: mobile fills available space, desktop uses natural size (1).
  const zoomedInScale = compact
    ? Math.min((ringArea.w - gap * 2) / naturalW, (ringArea.h - gap * 2) / naturalH)
    : 1
  const currentScale = zoomed ? zoomedInScale : zoomedOutRadius / outerRadius

  // Container centre — the fixed point that all ring transforms orbit around.
  const cx = containerSize / 2
  const cy = containerSize / 2

  const currentCenter: [number, number] = zoomed
    ? [cx, cy * ZOOMED_CENTER_RATIO + centerRadius * zoomedInScale]
    : [cx, cy - bottomPad / 2]

  const isCircle = view === 'circle'

  // ── Keyboard navigation when zoomed ────────────────────────────────────────
  useEffect(() => {
    if (!isCircle || !zoomed) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { setIdx(prev => prev + 1); e.preventDefault() }
      else if (e.key === 'ArrowLeft') { setIdx(prev => prev - 1); e.preventDefault() }
      else if (e.key === 'Escape') { resetZoom(); e.preventDefault() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isCircle, zoomed, resetZoom])

  // Swipe ref for zoomed mode (handled inside handleRingPointerDown/Up).
  const swipeRef = useRef<{ x: number; y: number; id: number } | null>(null)

  // Reset interaction state when leaving circle view
  useEffect(() => {
    if (!isCircle) resetZoom()
  }, [isCircle, resetZoom])

  const handleCardClick = useCallback((e: React.MouseEvent, i: number) => {
    e.stopPropagation()
    if (suppressClickRef.current) { suppressClickRef.current = false; return }
    if (!zoomed) {
      setZoomed(true)
      setIdx(prev => prev + shortestAngle(prev, i, count))
    } else if (wrapValue(idx, count) === i) {
      // Focused card: let the Link navigate to detail page
      return
    } else {
      setIdx(prev => prev + shortestAngle(prev, i, count))
    }
  }, [zoomed, idx, count])

  // Which card index is currently "focused" (wrapped into [0, count))
  const focusedIdx = wrapValue(idx, count)

  // Caption: species name of hovered card (ring) or focused card (zoomed)
  const captionCard = zoomed
    ? circleData[focusedIdx]
    : hovered !== null
      ? circleData[wrapValue(hovered, count)]
      : null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="mx-auto max-w-sm md:max-w-2xl flex flex-col"
      style={isCircle ? { height: 'calc(100vh - 5rem)' } : undefined}
    >
      {/* ── Toolbar: filter (left) + switch view / exit fullscreen (right) ──── */}
      <div className="flex shrink-0 items-center justify-between px-4">
        {/* Left — filter dropdown */}
        {zoomed ? (
          <div />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isEmpty}
              className={cn(
                buttonVariants({ variant: hasFilter ? 'outline' : 'ghost', size: 'sm' }),
                'gap-1 px-2 lowercase cursor-pointer',
              )}
              aria-label="Filter by kingdom"
            >
              <MdIcon name="filter_list" />
              {filterLabel}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={6} className="font-sans-ui shadow-none ring-0">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{sortByLabel}</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={activeSort} onValueChange={(v) => selectSort(v as SortOption)}>
                  {(['kingdom', 'name', 'date'] as const).map((s) => (
                    <DropdownMenuRadioItem key={s} value={s}>
                      {sortLabels[s]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>{filterByKingdomLabel}</DropdownMenuLabel>
                {presentKingdoms.map((k) => (
                  <DropdownMenuCheckboxItem
                    key={k}
                    checked={activeKingdoms.includes(k)}
                    onClick={() => toggleKingdom(k)}
                  >
                    {kingdomLabels[k]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              {hasFilter && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => clearKingdoms()}
                  >
                    {clearAllLabel}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Right — switch view / exit fullscreen */}
        {zoomed ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2 ml-auto lowercase"
            onClick={resetZoom}
            aria-label="Exit fullscreen"
          >
            <MdIcon name="fullscreen_exit" />
            {exitFullscreenLabel}
          </Button>
        ) : canCircle ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2 lowercase"
            onClick={() => {
              const next = view === 'grid' ? 'circle' : 'grid'
              setView(next)
              router.replace(buildUrl(activeSort, activeKingdoms, next), { scroll: false })
            }}
            aria-label="Switch view"
          >
            <MdIcon name="swap_horiz" />
            {switchViewLabel}
          </Button>
        ) : (
          <Popover>
            <PopoverTrigger
              disabled={isEmpty}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'gap-1 px-2 lowercase cursor-pointer',
              )}
              aria-label="Switch view"
            >
              <MdIcon name="swap_horiz" />
              {switchViewLabel}
            </PopoverTrigger>
            <PopoverContent align="end" className="font-sans-ui shadow-none ring-0 w-56">
              <PopoverHeader>
                <PopoverTitle>{circleUnavailableLabel}</PopoverTitle>
                <PopoverDescription>{circleUnavailableHint}</PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* ── Grid view / empty state — server-rendered children ────────────── */}
      {(!isCircle || isEmpty) && <div className="pb-4">{children}</div>}

      {/* ── Circle view ──────────────────────────────────────────────────────── */}
      {isCircle && (
        <div
          ref={ringAreaRef}
          className="relative flex flex-1 items-center justify-center touch-none"
          style={{ overflowX: 'visible', overflowY: 'clip' }}
          onPointerDown={handleRingPointerDown}
          onPointerUp={handleRingPointerUp}
          onPointerCancel={handleRingPointerUp}
          onPointerMove={handleRingPointerMove}
        >
          {/* Ring canvas */}
          <div
            className="relative shrink-0"
            style={{ width: containerSize, height: containerSize }}
          >
            {containerSize > 0 && circleData.map((card, i) => {
              const angle = (i - idx) * angleStep

              // Hover spread: scale neighbours proportionally
              let imageScale = 1
              if (!zoomed && hovered !== null) {
                const d = Math.abs(shortestAngle(i, hovered, count))
                const t = Math.max(HOVER_SPREAD - d, 0) / HOVER_SPREAD
                imageScale = 1 + (HOVER_SCALE - 1) * t
              }

              // z-index: cards closer to hovered/focused card are on top
              const angularDist = Math.abs(shortestAngle(i, hovered ?? 0, count))
              const zIndex = count - Math.round(angularDist)

              // Transform chain: centre card → move to ring centre → rotate →
              // scale ring → step out to ring position → hover scale
              const transform = [
                `translate(${-naturalW / 2}px, ${-naturalH / 2}px)`,
                `translate(${currentCenter[0]}px, ${currentCenter[1]}px)`,
                `rotate(${angle}rad)`,
                `scale(${currentScale})`,
                `translate(0px, ${-centerRadius}px)`,
                `scale(${imageScale})`,
              ].join(' ')

              const isFocused = zoomed && focusedIdx === i
              const imageContent = (
                <div className={cn('h-full w-full', zoomed && 'stamp-card-lg')}>
                  <div className={cn('h-full w-full', zoomed && 'p-2')}>
                    <div className="h-full w-full overflow-hidden bg-neutral-200">
                      {card.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={card.photoUrl}
                          alt={card.displayName}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              )

              return (
                <div
                  key={card.id}
                  data-card-index={i}
                  className="absolute transition-transform duration-300 ease-in-out"
                  style={{
                    width: naturalW,
                    height: naturalH,
                    transform,
                    zIndex,
                  }}
                  onClick={(e) => handleCardClick(e, i)}
                  onPointerEnter={(e) => { if (e.pointerType !== 'touch' && !zoomed) handleCardEnter(i) }}
                  onPointerLeave={(e) => { if (e.pointerType !== 'touch' && !zoomed) handleCardLeave() }}
                >
                  {isFocused ? (
                    <Link href={card.href} className="block h-full w-full">
                      {imageContent}
                    </Link>
                  ) : (
                    imageContent
                  )}
                </div>
              )
            })}

            {/* ── Taxonomy diagram ─────────────────────────────────────── */}
            <RadialTree
              cards={circleData}
              containerSize={containerSize}
              innerRadius={innerRadius}
              currentScale={currentScale}
              currentCenter={currentCenter}
              angleStep={angleStep}
              zoomed={zoomed}
              hoveredCardIndex={hovered}
              activeKingdoms={activeKingdoms}
              rankLabels={rankLabels}
              idx={idx}
              peekedNodeId={peekedNodeId}
              suppressClickRef={suppressClickRef}
            />
          </div>

          {/* ── Caption bar — floats at the bottom of the ring area ─────────── */}
          {captionCard && (
            <div className="absolute bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3">
              {zoomed && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="inline-flex"
                  onClick={(e) => { e.stopPropagation(); setIdx(prev => prev - 1) }}
                  aria-label="Previous"
                >
                  <MdIcon name="arrow_circle_left" />
                </Button>
              )}

              <div className="w-60 text-center">
                <p className="truncate text-sm font-semibold">
                  {captionCard.displayName}
                </p>
              </div>

              {zoomed && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="inline-flex"
                  onClick={(e) => { e.stopPropagation(); setIdx(prev => prev + 1) }}
                  aria-label="Next"
                >
                  <MdIcon name="arrow_circle_right" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
