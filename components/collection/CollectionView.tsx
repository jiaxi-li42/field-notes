'use client'

import { useState, useEffect, useCallback, useRef, type PointerEvent as RPointerEvent } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MdIcon } from '@/components/ui/MdIcon'

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
}

interface CollectionViewProps {
  /** Plain-object card data for the circle layout (serialisable across the server boundary). */
  circleData: CircleCardData[]
  switchViewLabel: string
  exitFullscreenLabel: string
  lang: string
  /** Server-rendered grid markup passed as children — rendered as-is in grid mode. */
  children: React.ReactNode
}

// ── Component ────────────────────────────────────────────────────────────────
export function CollectionView({ circleData, switchViewLabel, exitFullscreenLabel, lang, children }: CollectionViewProps) {
  const [view, setView] = useState<'grid' | 'circle'>('grid')

  // ── Interaction state ──────────────────────────────────────────────────────
  const [hovered, setHovered] = useState<number | null>(null)
  const [zoomed, setZoomed] = useState(false)
  const [idx, setIdx] = useState(0)

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
      else if (e.key === 'Escape') { setZoomed(false); setHovered(null); e.preventDefault() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isCircle, zoomed])

  // ── Swipe gesture when zoomed (touch only) ─────────────────────────────────
  const swipeRef = useRef<{ x: number; y: number; id: number } | null>(null)

  const onPointerDown = useCallback((e: RPointerEvent) => {
    if (!zoomed || e.pointerType !== 'touch') return
    swipeRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }, [zoomed])

  const onPointerUp = useCallback((e: RPointerEvent) => {
    const start = swipeRef.current
    if (!start || start.id !== e.pointerId) return
    swipeRef.current = null
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      e.stopPropagation()
      setIdx(prev => prev + (dx < 0 ? 1 : -1))
    }
  }, [])

  // Reset interaction state when leaving circle view
  useEffect(() => {
    if (!isCircle) {
      setZoomed(false)
      setHovered(null)
      setIdx(0)
    }
  }, [isCircle])

  const handleCardClick = useCallback((e: React.MouseEvent, i: number) => {
    e.stopPropagation()
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
      {/* ── Toolbar ───────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-4 px-4">
        {zoomed ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2"
            onClick={() => { setZoomed(false); setHovered(null) }}
            aria-label="Exit fullscreen"
          >
            <MdIcon name="fullscreen_exit" />
            {exitFullscreenLabel}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2"
            onClick={() => setView(v => (v === 'grid' ? 'circle' : 'grid'))}
            aria-label="Switch view"
          >
            <MdIcon name="swap_horiz" />
            {switchViewLabel}
          </Button>
        )}
      </div>

      {/* ── Grid view — server-rendered children ─────────────────────────────── */}
      {!isCircle && <div className="pb-4">{children}</div>}

      {/* ── Circle view ──────────────────────────────────────────────────────── */}
      {isCircle && (
        <div
          ref={ringAreaRef}
          className="relative flex flex-1 items-center justify-center touch-pan-y"
          style={{ overflowX: 'visible', overflowY: 'clip' }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
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
                <div className="h-full w-full overflow-hidden bg-neutral-200">
                  {card.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.photoUrl}
                      alt={card.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
              )

              return (
                <div
                  key={card.id}
                  className="absolute transition-transform duration-300 ease-in-out"
                  style={{
                    width: naturalW,
                    height: naturalH,
                    transform,
                    zIndex,
                  }}
                  onClick={(e) => handleCardClick(e, i)}
                  onMouseEnter={() => { if (!zoomed) setHovered(i) }}
                  onMouseLeave={() => { if (!zoomed) setHovered(null) }}
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
                <p className={`truncate text-sm text-neutral-600 ${lang === 'zh' ? 'font-medium' : 'font-semibold'}`}>
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
