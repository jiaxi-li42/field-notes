import Link from 'next/link'
import { PlusIcon } from 'lucide-react'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { RecordingService } from '@/lib/services/RecordingService'
import { RecordingCard } from '@/components/recording/RecordingCard'
import { KingdomFilter } from '@/components/recording/KingdomFilter'
import type { Kingdom } from '@/lib/models/Species'

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

  const base = lang === 'zh' ? '/zh' : '/'
  const newHref = `${lang === 'zh' ? '/zh' : ''}/collection/new`

  const all = RecordingService.getAll()
  const recordings = kingdom
    ? all.filter((r) => r.species.kingdom === (kingdom as Kingdom))
    : all

  const isEmpty = recordings.length === 0

  return (
    <main className="container mx-auto max-w-2xl px-4 pb-28">
      <header className="flex items-center justify-between py-6">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.nav.collection}</h1>
        <span className="text-sm text-muted-foreground">
          {recordings.length}
        </span>
      </header>

      <KingdomFilter currentKingdom={kingdom} base={base} dict={dict} />

      <div className="mt-5 space-y-3">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {kingdom ? dict.collection.empty_filtered : dict.collection.empty}
            </p>
            {!kingdom && (
              <p className="mt-1 text-xs text-muted-foreground">{dict.collection.empty_hint}</p>
            )}
          </div>
        ) : (
          recordings.map((r) => (
            <RecordingCard
              key={r.id}
              recording={r}
              lang={lang}
              dict={dict}
              href={`${lang === 'zh' ? '/zh' : ''}/collection/${r.id}`}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <Link
        href={newHref}
        aria-label={dict.nav.new}
        className="fixed bottom-6 right-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <PlusIcon className="size-6" />
      </Link>
    </main>
  )
}
