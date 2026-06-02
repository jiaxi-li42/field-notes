import { Fragment } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { MdIcon } from '@/components/ui/MdIcon'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { RecordingService } from '@/lib/services/RecordingService'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PhotoCarousel } from '@/components/recording/PhotoCarousel'
import { DeleteButton } from '@/components/recording/DeleteButton'
import { kingdomColor } from '@/lib/utils/kingdom'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import { langPrefix } from '@/lib/utils/i18n'
import { buildTaxonRows } from '@/lib/utils/taxonomy'

export default async function RecordingDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>
}) {
  const { lang, id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`${lang === 'zh' ? '/zh' : ''}/login`)

  const dict = await getDictionary(lang)

  const recording = await RecordingService.getById(session.user.id, id)
  if (!recording) notFound()

  const { species, date, location, notes, photos } = recording
  const base = langPrefix(lang) || '/'
  const vernacular = lang === 'zh' ? species.vernacularNameZh : species.vernacularNameEn
  const displayName = vernacular || species.canonicalName

  const taxonRows = buildTaxonRows(species.taxon, dict.ranks)

  return (
    <main className="min-h-screen bg-neutral-100">
      {/* Back button — fixed over the carousel */}
      <div className="fixed left-0 top-0 z-10 p-4">
        <Link
          href={base}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
          aria-label={dict.nav.collection}
        >
          <MdIcon name="arrow_back" />
        </Link>
      </div>

      {/* Photo carousel — full width, no padding */}
      {photos.length > 0 ? (
        <PhotoCarousel photos={photos.map((p) => ({ id: p.id, url: p.url, caption: p.caption }))} />
      ) : (
        <div className="aspect-[3/4] w-full bg-neutral-200" />
      )}

      {/* Content */}
      <div className="mx-auto max-w-sm md:max-w-2xl px-6 pb-12">
        {/* Species name + kingdom */}
        <div className="space-y-2 pt-6 pb-5">
          <h1 className="text-2xl tracking-tight">{displayName}</h1>
          <div className="flex items-center gap-1.5">
            <span
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: kingdomColor(species.kingdom) }}
            />
            <span className="text-sm font-sans-ui">{dict.kingdoms[species.kingdom] ?? species.kingdom}</span>
          </div>
        </div>

        {/* Date added */}
        <Separator />
        <div className="py-4">
          <p className="mb-1 text-xs text-muted-foreground font-sans-ui">{dict.detail.date_added}</p>
          <p className="text-sm">{formatDate(date, lang)}</p>
        </div>

        {/* Observed location */}
        {location.placeName && (
          <>
            <Separator />
            <div className="py-4">
              <p className="mb-1 text-xs text-muted-foreground font-sans-ui">{dict.detail.observed_location}</p>
              <p className="text-sm">{location.placeName}</p>
            </div>
          </>
        )}

        {/* Notes */}
        {notes && (
          <>
            <Separator />
            <div className="py-4">
              <p className="mb-1 text-xs text-muted-foreground font-sans-ui">{dict.recording.notes}</p>
              <p className="text-sm whitespace-pre-wrap">{notes}</p>
            </div>
          </>
        )}

        {/* Taxonomy */}
        <Separator />
        <div className="py-4">
          <p className="mb-3 text-xs text-muted-foreground font-sans-ui">{dict.detail.taxonomy}</p>
          <div className="space-y-1 text-sm">
            {taxonRows.map(([label, value]) => (
              <p key={label}>
                <span>{label}</span>
                <span className="text-muted-foreground"> · </span>
                <span className={label === dict.ranks.genus || label === dict.ranks.species ? 'italic' : ''}>
                  {value}
                </span>
              </p>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <Link
            href={`${base === '/' ? '' : base}/collection/${id}/edit`}
            className={cn(buttonVariants({ variant: 'default', size: 'default' }), 'w-48')}
          >
            {dict.detail.edit}
          </Link>
          <DeleteButton
            recordingId={id}
            label={dict.actions.delete}
            confirmMessage={dict.detail.delete_confirm}
            redirectTo={base}
          />
        </div>
      </div>
    </main>
  )
}
