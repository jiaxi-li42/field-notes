import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { RecordingForm } from '@/components/recording/RecordingForm'

export default async function NewRecordingPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`${lang === 'zh' ? '/zh' : ''}/login`)

  const dict = await getDictionary(lang)

  return (
    <main className="min-h-screen bg-white">
      <RecordingForm lang={lang} dict={dict} />
    </main>
  )
}
