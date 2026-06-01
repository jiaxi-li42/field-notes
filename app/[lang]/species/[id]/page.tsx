import { Fragment } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MdIcon } from '@/components/ui/MdIcon'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { RecordingService } from '@/lib/services/RecordingService'
import { KingdomBadge } from '@/components/taxonomy/KingdomBadge'
import { RecordingCard } from '@/components/recording/RecordingCard'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { langPrefix } from '@/lib/utils/i18n'
import { buildTaxonRows } from '@/lib/utils/taxonomy'

export default async function SpeciesPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>
}) {
  const { lang, id } = await params
  const dict = await getDictionary(lang)

  const gbifKey = parseInt(id, 10)
  if (isNaN(gbifKey)) notFound()

  const all = RecordingService.getAll()
  const recordings = all.filter((r) => r.species.gbifKey === gbifKey)
  if (recordings.length === 0) notFound()

  const { species } = recordings[0]
  const base = langPrefix(lang) || '/'
  const vernacular = lang === 'zh' ? species.vernacularNameZh : species.vernacularNameEn
  const kingdomLabel = dict.kingdoms[species.kingdom] ?? species.kingdom

  const taxonRows = buildTaxonRows(species.taxon, dict.ranks)

  return (
    <main className="container mx-auto max-w-lg px-4 pt-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4">
        <Link
          href={base}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
          aria-label={dict.nav.collection}
        >
          <MdIcon name="arrow_back" />
        </Link>
        <KingdomBadge kingdom={species.kingdom} label={kingdomLabel} />
      </div>

      {/* Species name */}
      <div className="space-y-0.5 pb-5">
        <h1 className="text-xl font-semibold italic tracking-tight">
          {species.canonicalName}
        </h1>
        {vernacular && (
          <p className="text-sm text-muted-foreground">{vernacular}</p>
        )}
      </div>

      <Separator />

      {/* Taxonomy */}
      <div className="py-5">
        <p className="mb-3 text-sm font-medium">{dict.detail.taxonomy}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          {taxonRows.map(([label, value]) => (
            <Fragment key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className={label === dict.ranks.genus || label === dict.ranks.species ? 'italic' : ''}>
                {value}
              </dd>
            </Fragment>
          ))}
        </dl>
      </div>

      <Separator />

      {/* Recordings */}
      <div className="py-5">
        <p className="mb-3 text-sm font-medium">
          {dict.detail.all_recordings} ({recordings.length})
        </p>
        <div className="space-y-3">
          {recordings.map((r) => (
            <RecordingCard
              key={r.id}
              recording={r}
              lang={lang}
              dict={dict}
              href={`${lang === 'zh' ? '/zh' : ''}/collection/${r.id}`}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
