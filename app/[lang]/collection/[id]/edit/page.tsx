import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { RecordingService } from '@/lib/services/RecordingService'
import { RecordingForm, type RecordingInitialData } from '@/components/recording/RecordingForm'
import type { GBIFSuggestion } from '@/components/taxonomy/TaxonomySearch'

export default async function EditRecordingPage({
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

  const initialSpecies: GBIFSuggestion = {
    key: species.gbifKey,
    canonicalName: species.canonicalName,
    vernacularName: species.vernacularNameEn || undefined,
    vernacularNameZh: species.vernacularNameZh || undefined,
    kingdom: species.kingdom,
    phylum: species.taxon.phylum || undefined,
    class: species.taxon.taxonomyClass || undefined,
    order: species.taxon.order || undefined,
    family: species.taxon.family || undefined,
    genus: species.taxon.genus || undefined,
    species: species.taxon.species || undefined,
  }

  const initialData: RecordingInitialData = {
    recordingId: recording.id,
    species: initialSpecies,
    nameFields: {
      common: lang === 'zh'
        ? (species.vernacularNameZh || '')
        : (species.vernacularNameEn || ''),
      commonEn: species.vernacularNameEn || '',
      scientific: species.canonicalName,
    },
    taxonFields: {
      kingdom: species.taxon.kingdom,
      phylum: species.taxon.phylum,
      class: species.taxon.taxonomyClass,
      order: species.taxon.order,
      family: species.taxon.family,
      genus: species.taxon.genus,
      species: species.taxon.species,
    },
    taxonFieldsZh: {
      kingdom: species.taxon.kingdomZh,
      phylum: species.taxon.phylumZh,
      class: species.taxon.taxonomyClassZh,
      order: species.taxon.orderZh,
      family: species.taxon.familyZh,
      genus: species.taxon.genusZh,
    },
    date: new Date(date),
    location: location.placeName,
    notes,
    photos: photos.map((p) => ({
      id: p.id,
      url: p.url,
      previewUrl: p.url,
      caption: p.caption,
      width: p.width,
      height: p.height,
    })),
  }

  return (
    <main className="min-h-screen bg-white">
      <RecordingForm lang={lang} dict={dict} initialData={initialData} />
    </main>
  )
}
