import { NextRequest, NextResponse } from 'next/server'

// GBIF Backbone Taxonomy dataset key
const BACKBONE = 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c'
const GBIF_SEARCH = 'https://api.gbif.org/v1/species/search'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GBIFResult = Record<string, any>

/**
 * Score how well a result's vernacular names match the query (lower = better).
 * For prefix matches, shorter names score better so "English oak" beats
 * "English oak kermes" when the query is "english oa".
 */
function vernacularScore(result: GBIFResult, query: string): number {
  const q = query.toLowerCase()
  let bestPrefix = Infinity
  const names: string[] = (result.vernacularNames ?? []).map(
    (v: GBIFResult) => (v.vernacularName ?? '').toLowerCase(),
  )
  for (const name of names) {
    if (name === q) return 0                               // exact match
    if (name.startsWith(q)) bestPrefix = Math.min(bestPrefix, name.length)
  }
  if (bestPrefix < Infinity) return 100 + bestPrefix       // prefix — shorter wins
  const canon = (result.canonicalName ?? '').toLowerCase()
  if (canon.startsWith(q)) return 200 + canon.length       // canonical prefix — shorter wins
  return 400
}

/** Rank-based boost: species/subspecies first, then genus, then everything else. */
function rankScore(r: GBIFResult): number {
  const rank = (r.rank ?? '').toUpperCase()
  if (rank === 'SPECIES' || rank === 'SUBSPECIES') return 0
  if (rank === 'GENUS') return 1
  return 2
}

/** Pick the best duplicate: prefer backbone entry, then most vernacular names. */
function dataQuality(r: GBIFResult): number {
  let score = 0
  if (r.key === r.nubKey) score += 100
  score += (r.vernacularNames ?? []).length
  return score
}

/** Deduplicate by nubKey (falls back to canonicalName), keeping the richest entry. */
function deduplicate(results: GBIFResult[]): GBIFResult[] {
  const best = new Map<string, GBIFResult>()
  for (const r of results) {
    const dedupeKey = String(r.nubKey ?? '') || (r.canonicalName ?? '')
    if (!dedupeKey) continue
    const existing = best.get(dedupeKey)
    if (!existing || dataQuality(r) > dataQuality(existing)) {
      best.set(dedupeKey, r)
    }
  }
  return [...best.values()]
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const url = new URL(GBIF_SEARCH)
  url.searchParams.set('q', q)
  url.searchParams.set('datasetKey', BACKBONE)
  url.searchParams.set('status', 'ACCEPTED')
  url.searchParams.set('limit', '50')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json([], { status: 502 })

  const data = await res.json()
  const results = (data.results ?? []) as GBIFResult[]

  const unique = deduplicate(results)

  // Sort: species rank first, then by vernacular/canonical match quality
  unique.sort((a, b) => {
    const rd = rankScore(a) - rankScore(b)
    if (rd !== 0) return rd
    return vernacularScore(a, q) - vernacularScore(b, q)
  })

  // Flatten: pick the first English vernacular name (or any) as a top-level field
  const out = unique.slice(0, 10).map((r) => {
    const names: { vernacularName?: string; language?: string }[] = r.vernacularNames ?? []
    const eng = names.find((v) => v.language === 'eng')
    const vernacularName = eng?.vernacularName ?? names[0]?.vernacularName ?? ''
    return { ...r, vernacularName }
  })

  return NextResponse.json(out)
}
