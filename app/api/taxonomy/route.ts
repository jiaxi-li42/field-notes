import { NextRequest, NextResponse } from 'next/server'

const GBIF_SUGGEST = 'https://api.gbif.org/v1/species/suggest'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const res = await fetch(
    `${GBIF_SUGGEST}?q=${encodeURIComponent(q)}&limit=10`,
    { next: { revalidate: 3600 } },
  )
  if (!res.ok) return NextResponse.json([], { status: 502 })

  return NextResponse.json(await res.json())
}
