import { Fragment } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeftIcon, CalendarIcon, MapPinIcon } from 'lucide-react'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { RecordingService } from '@/lib/services/RecordingService'
import { KingdomBadge } from '@/components/taxonomy/KingdomBadge'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils'

export default async function RecordingDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>
}) {
  const { lang, id } = await params
  const dict = await getDictionary(lang)

  const recording = RecordingService.getById(id)
  if (!recording) notFound()

  const { species, date, location, notes, photos } = recording
  const base = lang === 'zh' ? '/zh' : '/'
  const vernacular = lang === 'zh' ? species.vernacularNameZh : species.vernacularNameEn
  const kingdomLabel = dict.kingdoms[species.kingdom] ?? species.kingdom

  const taxonRows: [string, string][] = [
    ['Kingdom', species.taxon.kingdom],
    ['Phylum', species.taxon.phylum],
    ['Class', species.taxon.taxonomyClass],
    ['Order', species.taxon.order],
    ['Family', species.taxon.family],
    ['Genus', species.taxon.genus],
    ['Species', species.taxon.species],
  ].filter(([, v]) => v)

  return (
    <main className="container mx-auto max-w-lg px-4 pt-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4">
        <Link
          href={base}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
          aria-label={dict.nav.collection}
        >
          <ArrowLeftIcon />
        </Link>
        <KingdomBadge kingdom={species.kingdom} label={kingdomLabel} />
      </div>

      {/* Species */}
      <div className="space-y-0.5 pb-5">
        <h1 className="text-xl font-semibold italic tracking-tight">
          {species.canonicalName}
        </h1>
        {vernacular && (
          <p className="text-sm text-muted-foreground">{vernacular}</p>
        )}
        <Link
          href={`${lang === 'zh' ? '/zh' : ''}/species/${species.gbifKey}`}
          className="inline-block pt-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {dict.detail.all_recordings}
        </Link>
      </div>

      <Separator />

      {/* Date & Location */}
      <div className="space-y-3 py-5">
        <div className="flex items-center gap-2 text-sm">
          <CalendarIcon className="size-4 text-muted-foreground" />
          <span>{formatDate(date, lang)}</span>
        </div>
        {location.placeName && (
          <div className="flex items-center gap-2 text-sm">
            <MapPinIcon className="size-4 text-muted-foreground" />
            <span>{location.placeName}</span>
          </div>
        )}
      </div>

      {notes && (
        <>
          <Separator />
          <div className="py-5">
            <p className="mb-1.5 text-sm font-medium">{dict.recording.notes}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
          </div>
        </>
      )}

      {photos.length > 0 && (
        <>
          <Separator />
          <div className="py-5">
            <p className="mb-3 text-sm font-medium">{dict.recording.photos}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((photo) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={photo.id}
                  src={photo.url}
                  alt={photo.caption}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Taxonomy */}
      <div className="py-5">
        <p className="mb-3 text-sm font-medium">{dict.detail.taxonomy}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          {taxonRows.map(([label, value]) => (
            <Fragment key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className={label === 'Genus' || label === 'Species' ? 'italic' : ''}>
                {value}
              </dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </main>
  )
}
