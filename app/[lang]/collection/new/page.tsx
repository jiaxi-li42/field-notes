import { getDictionary } from '@/lib/i18n/dictionaries'
import { RecordingForm } from '@/components/recording/RecordingForm'

export default async function NewRecordingPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const dict = await getDictionary(lang)

  return (
    <main className="container mx-auto max-w-lg px-4 pt-6">
      <RecordingForm lang={lang} dict={dict} />
    </main>
  )
}
