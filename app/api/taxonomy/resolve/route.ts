import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const INAT_SEARCH = 'https://api.inaturalist.org/v1/taxa'

type InatAncestor = {
  rank?: string
  name?: string
  preferred_common_name?: string
}

const TARGET_RANKS = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus'] as const

/**
 * Resolve a scientific name to its Chinese vernacular name + zh taxonomy
 * via iNaturalist.
 * GET /api/taxonomy/resolve?name=Quercus+robur
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const name = request.nextUrl.searchParams.get('name')?.trim()
  if (!name) return NextResponse.json({ vernacularNameZh: '', taxonZh: null })

  // Step 1: Search for the taxon
  const searchUrl = new URL(INAT_SEARCH)
  searchUrl.searchParams.set('q', name)
  searchUrl.searchParams.set('locale', 'zh-CN')
  searchUrl.searchParams.set('per_page', '10')
  searchUrl.searchParams.set('is_active', 'true')

  const searchRes = await fetch(searchUrl.toString(), { next: { revalidate: 86400 } })
  if (!searchRes.ok) return NextResponse.json({ vernacularNameZh: '', taxonZh: null })

  const searchData = await searchRes.json()
  const results = (searchData.results ?? []) as {
    id?: number
    name?: string
    preferred_common_name?: string
  }[]

  // Find the first result whose scientific name matches AND has a zh name
  const match = results.find(
    (t) => t.name === name && t.preferred_common_name,
  )
  const vernacularNameZh = match?.preferred_common_name ?? ''

  // Step 2: Fetch ancestor details for zh taxonomy names
  // Use the matched taxon (or first exact-name match) to get ancestors
  const taxonForAncestors = match ?? results.find((t) => t.name === name)
  let taxonZh: Record<string, string> | null = null

  if (taxonForAncestors?.id) {
    try {
      const detailUrl = `${INAT_SEARCH}/${taxonForAncestors.id}?locale=zh-CN`
      const detailRes = await fetch(detailUrl, { next: { revalidate: 86400 } })
      if (detailRes.ok) {
        const detailData = await detailRes.json()
        const taxonResult = detailData.results?.[0]
        const ancestors: InatAncestor[] = taxonResult?.ancestors ?? []

        taxonZh = {}
        for (const ancestor of ancestors) {
          const rank = ancestor.rank?.toLowerCase()
          if (
            rank &&
            TARGET_RANKS.includes(rank as (typeof TARGET_RANKS)[number]) &&
            ancestor.preferred_common_name
          ) {
            taxonZh[rank] = ancestor.preferred_common_name
          }
        }
        // Only return if we found at least one zh name
        if (Object.keys(taxonZh).length === 0) taxonZh = null
      }
    } catch {
      // Non-critical — zh taxonomy is optional
    }
  }

  return NextResponse.json({ vernacularNameZh, taxonZh })
}
