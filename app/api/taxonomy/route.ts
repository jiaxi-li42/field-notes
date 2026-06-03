import { NextRequest, NextResponse } from 'next/server'

const GBIF_SEARCH = 'https://api.gbif.org/v1/species/search'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const res = await fetch(
    `${GBIF_SEARCH}?q=${encodeURIComponent(q)}&limit=10`,
    { next: { revalidate: 3600 } },
  )
  if (!res.ok) return NextResponse.json([], { status: 502 })

  const data = await res.json()

  return NextResponse.json(data.results ?? [])
}
