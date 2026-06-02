'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { hierarchy, tree } from 'd3-hierarchy'
import { buildTaxonTree, type TaxonTreeNode } from '@/lib/utils/buildTaxonTree'
import { kingdomColor } from '@/lib/utils/kingdom'
import type { CircleCardData } from '@/components/collection/CollectionView'
import type { Kingdom } from '@/lib/models/Species'
import type { HierarchyPointNode } from 'd3-hierarchy'

// ── Tunables ────────────────────────────────────────────────────────────────
// Node radius in px (derived from area 4 px²).
const NODE_RADIUS = Math.sqrt(4 / Math.PI)
// Hit area radius (px) — invisible circle for easier hovering.
const HIT_RADIUS = 8
// Neutral colours (shadcn CSS vars).
const NEUTRAL_NODE = 'var(--foreground)'
// Opacity for non-highlighted elements when something is hovered.
const DIM_OPACITY = 0.1
// Fraction of the ring interior the tree fills (0–1).
// 1 = genus ring touches the inner card edge; 0.7 = 30% gap.
const TREE_RADIUS_RATIO = 0.95
// Fraction of the tree radius reserved as the inner hole (donut).
// 0 = no hole (kingdom ring at centre), 0.5 = inner half is empty.
const INNER_RADIUS_RATIO = 0.7
// Per-depth ring weights — controls the radial spacing of each concentric ring.
// Depth 1 = kingdom, 2 = phylum, …, 6 = genus, 7 = species (leaves, not rendered).
// Index 0 is skipped (root is hidden). Equal values = even spacing.
const RING_WEIGHTS = [1, 1, 1, 1, 1, 1, 1]
// Depth ring: outline circle at the hovered node's depth radius.
const DEPTH_RING_STROKE = 1
// Hover label offset from node (screen px).
const LABEL_OFFSET = 16


// ── Helpers ─────────────────────────────────────────────────────────────────
/** Convert polar (angle, radius) to Cartesian. Angle 0 = top (12 o'clock). */
function polarToXY(angle: number, radius: number): [number, number] {
  return [
    radius * Math.cos(angle - Math.PI / 2),
    radius * Math.sin(angle - Math.PI / 2),
  ]
}

/** Collect all node IDs in a subtree using built-in node.descendants(). */
function collectDescendantIds(node: HierarchyPointNode<TaxonTreeNode>): Set<string> {
  return new Set(node.descendants().map(nodeId))
}

/** Collect ancestor node IDs (leaf → root) using built-in node.ancestors(). */
function collectAncestorIds(node: HierarchyPointNode<TaxonTreeNode>): Set<string> {
  return new Set(node.ancestors().map(nodeId))
}

/** Stable unique ID for a node based on depth + name + rank. */
function nodeId(node: HierarchyPointNode<TaxonTreeNode>): string {
  return `${node.depth}-${node.data.name}-${node.data.rank}`
}

// ── Props ───────────────────────────────────────────────────────────────────
interface RadialTreeProps {
  cards: CircleCardData[]
  containerSize: number
  innerRadius: number
  currentScale: number
  currentCenter: [number, number]
  angleStep: number
  zoomed: boolean
  hoveredCardIndex: number | null
  activeKingdoms: Kingdom[]
  rankLabels: Record<string, string>
  idx: number
}

// ── Component ───────────────────────────────────────────────────────────────
export function RadialTree({
  cards,
  containerSize,
  innerRadius,
  currentScale,
  currentCenter,
  angleStep,
  zoomed,
  hoveredCardIndex,
  activeKingdoms,
  rankLabels,
  idx,
}: RadialTreeProps) {
  const [hoveredNode, setHoveredNode] = useState<HierarchyPointNode<TaxonTreeNode> | null>(null)
  const [pinnedNode, setPinnedNode] = useState<HierarchyPointNode<TaxonTreeNode> | null>(null)
  const count = cards.length

  // Clear stale pin when context changes (cards rebuild the hierarchy,
  // kingdom filter changes the visual context).
  useEffect(() => {
    setPinnedNode(null)
    setHoveredNode(null)
  }, [cards, activeKingdoms])

  // Screen-space radius: the outer edge of the tree layout.
  const screenRadius = innerRadius * currentScale * TREE_RADIUS_RATIO

  // ── Compute tree layout in screen-space ─────────────────────────────────
  const { root: layoutRoot, nodeMap } = useMemo(() => {
    if (count === 0 || screenRadius <= 0) return { root: null, nodeMap: new Map<number, HierarchyPointNode<TaxonTreeNode>>() }

    const treeData = buildTaxonTree(cards)
    const root = hierarchy(treeData)

    // Layout directly at screen-space radius — no scale() needed on the SVG group.
    const treeLayout = tree<TaxonTreeNode>()
      .size([2 * Math.PI, screenRadius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth)

    const laid = treeLayout(root)

    // Per-depth ring spacing: the inner hole (INNER_RADIUS_RATIO) is reserved;
    // the remaining band is split among depths 1+ by weight.
    // Depth 0 (root, hidden) stays at centre.
    const innerHole = screenRadius * INNER_RADIUS_RATIO
    const band = screenRadius - innerHole
    const maxDepth = laid.height
    // Skip weight[0] (root→kingdom gap) since root is hidden.
    const weights = RING_WEIGHTS.slice(1, maxDepth)
    const totalWeight = weights.reduce((s, w) => s + w, 0) || 1
    const cumulativeRadius: number[] = [0] // depth 0 = root at centre
    let acc = 0
    for (const w of weights) {
      acc += w
      cumulativeRadius.push(innerHole + (acc / totalWeight) * band)
    }
    laid.each(node => {
      if (node.depth === 0) { node.y = 0; return }
      node.y = cumulativeRadius[Math.min(node.depth, cumulativeRadius.length - 1)]
    })

    // Override leaf angles to match ring card positions.
    const leaves = laid.leaves()
    for (const leaf of leaves) {
      if (leaf.data.cardIndex !== undefined) {
        leaf.x = leaf.data.cardIndex * angleStep
      }
    }

    // Recompute internal node angles as circular mean of children (bottom-up).
    laid.eachAfter(node => {
      if (node.children && node.children.length > 0) {
        let sinSum = 0, cosSum = 0
        for (const child of node.children) {
          sinSum += Math.sin(child.x)
          cosSum += Math.cos(child.x)
        }
        node.x = Math.atan2(sinSum, cosSum)
        if (node.x < 0) node.x += 2 * Math.PI
      }
    })

    // Map from cardIndex → leaf node for ring hover lookup.
    const map = new Map<number, HierarchyPointNode<TaxonTreeNode>>()
    for (const leaf of leaves) {
      if (leaf.data.cardIndex !== undefined) {
        map.set(leaf.data.cardIndex, leaf)
      }
    }

    return { root: laid, nodeMap: map }
  }, [cards, count, screenRadius, angleStep])

  // ── Highlighted node set ──────────────────────────────────────────────────
  // Priority: pinned > hover > ring card hover > kingdom filter.
  const highlightSource = pinnedNode ?? hoveredNode
  const highlightedIds = useMemo(() => {
    if (highlightSource) {
      const ids = collectDescendantIds(highlightSource)
      // Hover only: also highlight same-depth nodes that share the kingdom.
      if (!pinnedNode && layoutRoot && highlightSource.data.kingdom) {
        const depth = highlightSource.depth
        const kingdom = highlightSource.data.kingdom
        for (const node of layoutRoot.descendants()) {
          if (node.depth === depth && node.data.kingdom === kingdom) {
            ids.add(nodeId(node))
          }
        }
      }
      return ids
    }
    if (hoveredCardIndex !== null) {
      const leaf = nodeMap.get(hoveredCardIndex)
      if (leaf) return collectAncestorIds(leaf)
    }
    if (activeKingdoms.length > 0 && layoutRoot) {
      const ids = new Set<string>()
      for (const node of layoutRoot.descendants()) {
        if (node.data.kingdom && activeKingdoms.includes(node.data.kingdom as Kingdom)) ids.add(nodeId(node))
      }
      return ids
    }
    return new Set<string>()
  }, [highlightSource, pinnedNode, hoveredCardIndex, nodeMap, activeKingdoms, layoutRoot])

  // Per-node color: each highlighted node uses its own kingdom color.
  // Depth ring and label use the specific source's kingdom.
  const nodeColor = useCallback((node: HierarchyPointNode<TaxonTreeNode>) => {
    const k = node.data.kingdom as Kingdom | undefined
    return k ? kingdomColor(k) : NEUTRAL_NODE
  }, [])

  const depthRingKingdom = highlightSource?.data.kingdom
    ?? (hoveredCardIndex !== null ? cards[hoveredCardIndex]?.kingdom : undefined)
    ?? (activeKingdoms.length === 1 ? activeKingdoms[0] : undefined)
  const depthRingColor = depthRingKingdom ? kingdomColor(depthRingKingdom) : NEUTRAL_NODE

  // ── Event handlers ────────────────────────────────────────────────────────
  // Debounce leave so the depth ring stays visible while moving between nodes.
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleNodeEnter = useCallback((node: HierarchyPointNode<TaxonTreeNode>) => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null }
    setHoveredNode(node)
  }, [])
  const handleNodeLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => {
      setHoveredNode(null)
      leaveTimer.current = null
    }, 300)
  }, [])
  const handleNodeClick = useCallback((e: React.MouseEvent, node: HierarchyPointNode<TaxonTreeNode>) => {
    e.stopPropagation()
    setPinnedNode(prev => prev === node ? null : node)
  }, [])
  const handleBackgroundClick = useCallback(() => {
    setPinnedNode(null)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  if (!layoutRoot || count === 0) return null

  const allNodes = layoutRoot.descendants()

  // Whether any highlight is active (tree node or ring card hovered).
  const hasHighlight = highlightedIds.size > 0

  // Rotation: ring rotates by idx * angleStep; tree follows.
  const rotationDeg = (-idx * angleStep * 180) / Math.PI

  return (<>
    <svg
      className="absolute inset-0"
      width={containerSize}
      height={containerSize}
      style={{
        opacity: zoomed ? 0 : 1,
        pointerEvents: zoomed ? 'none' : 'auto',
        transition: zoomed ? 'none' : 'opacity 0ms 300ms',
      }}
      onClick={handleBackgroundClick}
    >
      {/* Tree group: translate to ring centre, rotate with ring. No scale(). */}
      <g transform={`translate(${currentCenter[0]}, ${currentCenter[1]}) rotate(${rotationDeg})`}>
        {/* Depth ring — outline circle at the hovered node's radius */}
        {hoveredNode && (!hasHighlight || highlightedIds.has(nodeId(hoveredNode))) && (
          <circle
            cx={0} cy={0}
            r={hoveredNode.y}
            fill="none"
            stroke={depthRingColor}
            strokeWidth={DEPTH_RING_STROKE}
            style={{ pointerEvents: 'none' }}
          />
        )}
        {/* Nodes — filled circles */}
        {allNodes.map(node => {
          if (node.depth === 0) return null // skip root node (donut hole)
          if (node.data.rank === 'species') return null // skip species (redundant with cards)
          const id = nodeId(node)
          const highlighted = highlightedIds.has(id)
          const [x, y] = polarToXY(node.x, node.y)

          const dimmed = hasHighlight && !highlighted
          const disabled = activeKingdoms.length > 0 && !highlighted

          return (
            <g
              key={id}
              onMouseEnter={disabled ? undefined : () => handleNodeEnter(node)}
              onMouseLeave={disabled ? undefined : handleNodeLeave}
              onClick={disabled ? undefined : (e) => handleNodeClick(e, node)}
              style={{ cursor: disabled ? 'default' : 'pointer' }}
            >
              {/* Invisible hit area */}
              <circle cx={x} cy={y} r={HIT_RADIUS} fill="transparent" style={{ pointerEvents: disabled ? 'none' : 'all' }} />
              {/* Visible node */}
              <circle
                cx={x}
                cy={y}
                r={NODE_RADIUS}
                fill={highlighted ? nodeColor(node) : NEUTRAL_NODE}
                opacity={dimmed ? DIM_OPACITY : 1}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          )
        })}
      </g>
    </svg>

    {/* Label overlay — separate SVG above cards so it's never occluded */}
    {hoveredNode && highlightedIds.has(nodeId(hoveredNode)) && (
      <svg
        className="pointer-events-none absolute inset-0"
        width={containerSize}
        height={containerSize}
        style={{ zIndex: 100 }} // above card z-indices (max ~count) and caption bar (z-50)
      >
        <HoverLabel
          node={hoveredNode}
          currentCenter={currentCenter}
          rotationDeg={rotationDeg}
          rankLabels={rankLabels}
        />
      </svg>
    )}
  </>
  )
}

// ── Hover label sub-component ───────────────────────────────────────────────
// Positioned along the radial axis (like D3 radial tree labels) so text
// follows the node's direction and never overlaps the depth ring.
function HoverLabel({
  node,
  currentCenter,
  rotationDeg,
  rankLabels,
}: {
  node: HierarchyPointNode<TaxonTreeNode>
  currentCenter: [number, number]
  rotationDeg: number
  rankLabels: Record<string, string>
}) {
  const rotationRad = (rotationDeg * Math.PI) / 180
  const angle = node.x + rotationRad // effective angle in radians

  // Normalise to [0, 2π) for top/bottom half check.
  const TWO_PI = 2 * Math.PI
  const norm = ((angle % TWO_PI) + TWO_PI) % TWO_PI
  const inBottomHalf = norm >= Math.PI

  // D3-style transform chain:
  //   1. translate to ring centre
  //   2. rotate so local +x points along the node's radial line
  //   3. translate along that line to the node's radius
  //   4. flip 180° in the bottom half so text always reads left-to-right
  const angleDeg = (angle * 180) / Math.PI
  const flipDeg = inBottomHalf ? 180 : 0
  const transform = [
    `translate(${currentCenter[0]},${currentCenter[1]})`,
    `rotate(${angleDeg - 90})`,
    `translate(${node.y},0)`,
    `rotate(${flipDeg})`,
  ].join(' ')

  // After the flip, "end" always means towards centre.
  const textX = inBottomHalf ? LABEL_OFFSET : -LABEL_OFFSET
  const anchor = inBottomHalf ? 'start' : 'end'

  const rankLabel = rankLabels[node.data.rank] ?? node.data.rank

  return (
    <g transform={transform}>
      <text
        x={textX}
        dy={-4}
        textAnchor={anchor}
        className="pointer-events-none select-none fill-foreground text-sm font-semibold"
      >
        {node.data.name}
      </text>
      <text
        x={textX}
        dy={12}
        textAnchor={anchor}
        className="pointer-events-none select-none fill-muted-foreground text-xs"
      >
        {rankLabel}
      </text>
    </g>
  )
}
