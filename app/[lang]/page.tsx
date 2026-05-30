import { getDictionary } from '@/lib/i18n/dictionaries'
import { RecordingService } from '@/lib/services/RecordingService'
import { StampCard } from '@/components/recording/StampCard'
import { CollectionHeader } from '@/components/collection/CollectionHeader'
import { CollectionView } from '@/components/collection/CollectionView'
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
  searchParams: Promise<{ kingdom?: string }>
}) {
  const { lang } = await params
  const { kingdom } = await searchParams
  const dict = await getDictionary(lang)

  const all = RecordingService.getAll()
  const recordings = kingdom
    ? all.filter((r) => r.species.kingdom === (kingdom as Kingdom))
    : all

  const isEmpty = recordings.length === 0
  const basePath = langPrefix(lang)

  // Server-side row chunking per breakpoint so divide-y separators land correctly
  const mobileRows = chunkBy(recordings, 3)   // 3-col layout
  const desktopRows = chunkBy(recordings, 5)  // 5-col layout

  // Slim serialisable data for the client-side circle view
  const circleData = recordings.map((r) => ({
    id: r.id,
    photoUrl: r.photos[0]?.url,
    displayName:
      (lang === 'zh' ? r.species.vernacularNameZh : r.species.vernacularNameEn) ||
      r.species.canonicalName,
    href: `${basePath}/collection/${r.id}`,
  }))

  return (
    <main className="min-h-screen bg-neutral-100">
      <CollectionHeader currentKingdom={kingdom} lang={lang} dict={dict} />

      {/* pt-20 clears the fixed header; max-width is handled per-view inside CollectionView */}
      <div className="pt-20">
        {isEmpty ? (
          <div className="mx-auto max-w-sm md:max-w-2xl flex flex-col items-center justify-center px-4 py-20 text-center">
            <p className="text-sm text-muted-foreground">
              {kingdom ? dict.collection.empty_filtered : dict.collection.empty}
            </p>
            {!kingdom && (
              <p className="mt-1 text-xs text-muted-foreground">{dict.collection.empty_hint}</p>
            )}
          </div>
        ) : (
          <CollectionView circleData={circleData} switchViewLabel={dict.header.switch_view} exitFullscreenLabel={dict.header.exit_fullscreen} lang={lang}>
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
          </CollectionView>
        )}
      </div>
    </main>
  )
}
