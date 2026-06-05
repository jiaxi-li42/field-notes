import { NextRequest, NextResponse } from 'next/server'

// GBIF Backbone Taxonomy dataset key
const BACKBONE = 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c'
const GBIF_SEARCH = 'https://api.gbif.org/v1/species/search'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GBIFResult = Record<string, any>

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Pick the best English vernacular name in a single pass.
 * Priority: exact query match > shortest prefix match > first English name.
 * `q` must already be lowercased.
 */
function pickEnglishName(result: GBIFResult, q: string): string {
  const names: { vernacularName?: string; language?: string }[] =
    result.vernacularNames ?? []
  let first = ''
  let bestPrefix = ''
  let bestLen = Infinity

  for (const v of names) {
    if (v.language !== 'eng') continue
    const name = v.vernacularName ?? ''
    if (!first) first = name

    const lower = name.toLowerCase()
    if (lower === q) return name                             // exact — can't beat this
    if (lower.startsWith(q) && lower.length < bestLen) {
      bestPrefix = name
      bestLen = lower.length
    }
  }
  return bestPrefix || first
}

/**
 * Score how well a displayed name matches the query (lower = better).
 * All arguments must already be lowercased.
 */
function displayScore(display: string, canonical: string, q: string): number {
  if (display === q) return 0                                // exact display match
  if (display.startsWith(q)) return 100 + display.length     // display prefix — shorter wins
  if (canonical.startsWith(q)) return 200 + canonical.length // canonical prefix — shorter wins
  return 400
}

/** Rank tiebreaker: species/subspecies > genus > other. */
function rankScore(rank: string): number {
  if (rank === 'SPECIES' || rank === 'SUBSPECIES') return 0
  if (rank === 'GENUS') return 1
  return 2
}

/** Pick the best duplicate: prefer backbone entry, then most vernacular names. */
function dataQuality(r: GBIFResult): number {
  return (r.key === r.nubKey ? 100 : 0) + (r.vernacularNames ?? []).length
}

/** Deduplicate by nubKey (falls back to canonicalName), keeping the richest entry. */
function deduplicate(results: GBIFResult[]): GBIFResult[] {
  const best = new Map<string, GBIFResult>()
  for (const r of results) {
    const id = String(r.nubKey ?? '') || (r.canonicalName ?? '')
    if (!id) continue
    const existing = best.get(id)
    if (!existing || dataQuality(r) > dataQuality(existing)) {
      best.set(id, r)
    }
  }
  return [...best.values()]
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('q')?.trim()
  if (!raw || raw.length < 2) return NextResponse.json([])
  const q = raw.toLowerCase()

  const url = new URL(GBIF_SEARCH)
  url.searchParams.set('q', raw)
  url.searchParams.set('datasetKey', BACKBONE)
  url.searchParams.set('status', 'ACCEPTED')
  url.searchParams.set('limit', '50')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json([], { status: 502 })

  const { results = [] } = await res.json()
  const unique = deduplicate(results as GBIFResult[])

  // Precompute scores + trim to client-needed fields in one pass.
  const scored = unique.map((r) => {
    const vernacularName = pickEnglishName(r, q)
    const canonicalName: string = r.canonicalName ?? ''
    return {
      _ds: displayScore(vernacularName.toLowerCase(), canonicalName.toLowerCase(), q),
      _rs: rankScore(((r.rank ?? '') as string).toUpperCase()),
      _ps: (r.vernacularNames ?? []).length,
      out: {
        key: r.key,
        canonicalName,
        vernacularName,
        rank: r.rank,
        kingdom: r.kingdom,
        phylum: r.phylum,
        class: r.class,
        order: r.order,
        family: r.family,
        genus: r.genus,
        species: r.species,
      },
    }
  })

  // Sort by precomputed scores — comparator does no extra work.
  scored.sort((a, b) =>
    (a._ds - b._ds) || (a._rs - b._rs) || (b._ps - a._ps),
  )

  return NextResponse.json(scored.slice(0, 10).map((s) => s.out))
}
