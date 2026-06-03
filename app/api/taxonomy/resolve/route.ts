import { NextRequest, NextResponse } from 'next/server'

const INAT_SEARCH = 'https://api.inaturalist.org/v1/taxa'

/**
 * Resolve a scientific name to its Chinese vernacular name via iNaturalist.
 * GET /api/taxonomy/resolve?name=Quercus+robur
 */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')?.trim()
  if (!name) return NextResponse.json({ vernacularNameZh: '' })

  const url = new URL(INAT_SEARCH)
  url.searchParams.set('q', name)
  url.searchParams.set('locale', 'zh')
  url.searchParams.set('per_page', '1')
  url.searchParams.set('is_active', 'true')

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } })
  if (!res.ok) return NextResponse.json({ vernacularNameZh: '' })

  const data = await res.json()
  const taxon = (data.results ?? [])[0]

  // Only use the result if the scientific name matches
  const vernacularNameZh =
    taxon && taxon.name === name ? (taxon.preferred_common_name ?? '') : ''

  return NextResponse.json({ vernacularNameZh })
}
