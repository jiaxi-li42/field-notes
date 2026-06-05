import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { RecordingService } from '@/lib/services/RecordingService'
import { StampCard } from '@/components/recording/StampCard'
import { CollectionHeader } from '@/components/collection/CollectionHeader'
import { CollectionView } from '@/components/collection/CollectionView'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import type { Kingdom } from '@/lib/models/Species'
import type { Recording } from '@/lib/models/Recording'
import { langPrefix } from '@/lib/utils/i18n'

// Pseudo-random scatter angles (degrees). Cycle through these per card position.
const STAMP_ROTATIONS = [-2.3, 1.8, -1.2, 2.7, -0.7, 1.4, -2.1, 0.9, -1.6, 2.4, -0.4, 1.1]

function chunkBy<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ kingdom?: string; sort?: string; view?: string }>
}) {
  const { lang } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`${lang === 'zh' ? '/zh' : ''}/login`)

  const { kingdom: kingdomParam, sort: sortParam, view: viewParam } = await searchParams
  const dict = await getDictionary(lang)

  // Multi-select: ?kingdom=Animalia,Plantae → ['Animalia', 'Plantae']
  const activeKingdoms: Kingdom[] = kingdomParam
    ? (kingdomParam.split(',') as Kingdom[])
    : []

  const activeSort = (sortParam === 'name' || sortParam === 'date') ? sortParam : 'kingdom'

  const all = await RecordingService.getAll(session.user.id)

  // Sort recordings based on selected sort option
  const recordings = [...all].sort((a, b) => {
    if (activeSort === 'name') {
      const nameA = a.species.displayName(lang)
      const nameB = b.species.displayName(lang)
      return nameA.localeCompare(nameB)
    }
    if (activeSort === 'date') {
      return b.createdAt.getTime() - a.createdAt.getTime()
    }
    // Default: kingdom (taxonomy sort)
    const ta = a.species.taxon
    const tb = b.species.taxon
    return (
      ta.kingdom.localeCompare(tb.kingdom) ||
      ta.phylum.localeCompare(tb.phylum) ||
      ta.taxonomyClass.localeCompare(tb.taxonomyClass) ||
      ta.order.localeCompare(tb.order) ||
      ta.family.localeCompare(tb.family) ||
      ta.genus.localeCompare(tb.genus) ||
      ta.species.localeCompare(tb.species)
    )
  })

  const isEmpty = recordings.length === 0
  const basePath = langPrefix(lang)

  // Grid view still filters by kingdom; circle view shows all with highlights
  const gridRecordings = activeKingdoms.length > 0
    ? recordings.filter((r) => activeKingdoms.includes(r.species.kingdom))
    : recordings

  // Server-side row chunking per breakpoint so divide-y separators land correctly
  const mobileRows = chunkBy(gridRecordings, 3)   // 3-col layout
  const desktopRows = chunkBy(gridRecordings, 5)  // 5-col layout

  // Slim serialisable data for the client-side circle view
  const circleData = recordings.map((r) => ({
    id: r.id,
    photoUrl: r.photos[0]?.url,
    displayName: r.species.displayName(lang),
    href: `${basePath}/collection/${r.id}`,
    // Taxonomy for tree visualisation (English — grouping key)
    kingdom: r.species.kingdom,
    phylum: r.species.taxon.phylum,
    taxonomyClass: r.species.taxon.taxonomyClass,
    order: r.species.taxon.order,
    family: r.species.taxon.family,
    genus: r.species.taxon.genus,
    species: r.species.taxon.species,
    // zh taxonomy display names
    ...(lang === 'zh' ? {
      kingdomZh: r.species.taxon.kingdomZh || undefined,
      phylumZh: r.species.taxon.phylumZh || undefined,
      taxonomyClassZh: r.species.taxon.taxonomyClassZh || undefined,
      orderZh: r.species.taxon.orderZh || undefined,
      familyZh: r.species.taxon.familyZh || undefined,
      genusZh: r.species.taxon.genusZh || undefined,
    } : {}),
  }))

  return (
    <main className="min-h-screen bg-neutral-100">
      <CollectionHeader lang={lang} dict={dict} />

      {/* pt-20 clears the fixed header; max-width is handled per-view inside CollectionView */}
      <div className="pt-20">
        <CollectionView
          circleData={circleData}
          activeKingdoms={activeKingdoms}
          rankLabels={dict.ranks}
          activeView={viewParam === 'circle' ? 'circle' : 'grid'}
          activeSort={activeSort}
          sortByLabel={dict.header.sort_by}
          sortLabels={{ name: dict.header.sort_name, date: dict.header.sort_date, kingdom: dict.header.sort_kingdom }}
          filterLabel={dict.header.filter}
          filterByKingdomLabel={dict.header.filter_by_kingdom}
          clearAllLabel={dict.collection.clear_all}
          switchViewLabel={dict.header.switch_view}
          exitFullscreenLabel={dict.header.exit_fullscreen}
          circleUnavailableLabel={dict.header.circle_unavailable}
          circleUnavailableHint={dict.header.circle_unavailable_hint}
          kingdomLabels={dict.kingdoms}
          kingdomsLabel={dict.ranks.kingdom}
          lang={lang}
        >
          {isEmpty ? (
            <Empty className="py-60 font-sans-ui">
              <EmptyHeader>
                <EmptyTitle className="font-sans-ui">
                  {activeKingdoms.length > 0 ? dict.collection.empty_filtered : dict.collection.empty}
                </EmptyTitle>
                <EmptyDescription>{dict.collection.empty_hint}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {/* ── Mobile: 3 columns ───────────────────────────────────────── */}
              <div className="md:hidden divide-y divide-neutral-200">
                {mobileRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-3 gap-x-2 gap-y-4 p-4">
                    {row.map((r: Recording, colIdx) => (
                      <StampCard
                        key={r.id}
                        recording={r}
                        lang={lang}
                        href={`${basePath}/collection/${r.id}`}
                        rotate={STAMP_ROTATIONS[(rowIdx * 3 + colIdx) % STAMP_ROTATIONS.length]}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* ── Desktop: 5 columns ──────────────────────────────────────── */}
              <div className="hidden md:block divide-y divide-neutral-200">
                {desktopRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-5 gap-x-2 gap-y-4 p-4">
                    {row.map((r: Recording, colIdx) => (
                      <StampCard
                        key={r.id}
                        recording={r}
                        lang={lang}
                        href={`${basePath}/collection/${r.id}`}
                        rotate={STAMP_ROTATIONS[(rowIdx * 5 + colIdx) % STAMP_ROTATIONS.length]}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </CollectionView>
      </div>
    </main>
  )
}
