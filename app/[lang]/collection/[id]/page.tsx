import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { RecordingService } from '@/lib/services/RecordingService'
import { buttonVariants } from '@/components/ui/button'
import { PhotoCarousel, PhotoGrid } from '@/components/recording/PhotoGrid'
import { DetailActions, BackButton } from '@/components/recording/RecordingForm'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import { langPrefix } from '@/lib/utils/i18n'
import { buildTaxonRows } from '@/lib/utils/taxonomy'

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-4 md:grid md:grid-cols-3">
      <dt className="mb-2 md:mb-0 text-xs text-muted-foreground font-bold lowercase">{label}</dt>
      <dd className="text-sm font-sans-ui md:col-span-2">{children}</dd>
    </div>
  )
}

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
  const hasZhName = lang === 'zh' && !!species.vernacularNameZh
  const vernacular = lang === 'zh'
    ? species.vernacularNameZh || species.vernacularNameEn
    : species.vernacularNameEn
  const displayName = vernacular || species.canonicalName

  const taxonRows = buildTaxonRows(species.taxon, dict.ranks, lang)

  return (
    <main className="min-h-screen bg-white">
      {/* Header — fixed */}
      <header className="fixed left-0 right-0 top-0 z-50 bg-white">
        <div className="mx-auto flex max-w-sm md:max-w-2xl items-center justify-between p-4">
          <BackButton
            label={dict.detail.return}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-2 lowercase')}
          />
          <DetailActions
          recordingId={id}
          editHref={`${base === '/' ? '' : base}/collection/${id}/edit`}
          labels={{
            edit: dict.detail.edit,
            delete: dict.actions.delete,
            deleteTitle: dict.detail.delete_title,
            deleteDescription: dict.detail.delete_description,
            deleteConfirm: dict.detail.delete_confirm,
            deletePending: dict.detail.delete_pending,
            cancel: dict.actions.cancel,
          }}
        />
        </div>
      </header>

      {/* Mobile carousel — full width, at top */}
      {photos.length > 0 && (
        <div className="md:hidden pt-14">
          <PhotoCarousel
            photos={photos.map((p) => ({ id: p.id, url: p.url, caption: p.caption, width: p.width, height: p.height }))}
          />
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-sm md:max-w-2xl px-4 pt-8 pb-4 md:pt-16 pb-8">
        {/* Species name + canonical name */}
        <div className="pb-4 gap-1 flex flex-col">
          <h1 className="text-2xl tracking-tight">{displayName}</h1>
          {hasZhName && species.vernacularNameEn ? (
            <p className="text-sm font-bold font-sans-ui">{species.vernacularNameEn}</p>
          ) : (
            vernacular && species.canonicalName !== displayName && (
              <p className="text-sm font-sans-ui italic">{species.canonicalName}</p>
            )
          )}
        </div>

        {/* Sections */}
        <dl className="divide-y divide-border">
          <Section label={dict.detail.taxonomy}>
            {taxonRows.map(([label, value, italic]) => (
              <p key={label}>
                <span>{label}</span>
                <span className="text-muted-foreground"> · </span>
                <span className={italic ? 'italic' : ''}>
                  {value}
                </span>
              </p>
            ))}
          </Section>

          {notes && (
            <Section label={dict.recording.notes}>
              <span className="whitespace-pre-wrap">{notes}</span>
            </Section>
          )}

          <Section label={dict.detail.date_added}>
            {formatDate(date, lang)}
          </Section>

          {location.placeName && (
            <Section label={dict.detail.observed_location}>
              {location.placeName}
            </Section>
          )}
        </dl>

        {/* Desktop photos — at bottom */}
        {photos.length > 0 && (
          <div className="hidden md:block pt-12">
            <PhotoGrid
              photos={photos.map((p) => ({ id: p.id, url: p.url, caption: p.caption, width: p.width, height: p.height }))}
            />
          </div>
        )}
      </div>
    </main>
  )
}
