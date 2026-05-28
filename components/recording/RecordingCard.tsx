import Link from 'next/link'
import { CalendarIcon, MapPinIcon } from 'lucide-react'
import { KingdomBadge } from '@/components/taxonomy/KingdomBadge'
import { kingdomColor } from '@/lib/utils/kingdom'
import { formatDate } from '@/lib/utils/date'
import type { Recording } from '@/lib/models/Recording'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface RecordingCardProps {
  recording: Recording
  lang: string
  dict: Pick<Dictionary, 'kingdoms'>
  href: string
}

export function RecordingCard({ recording, lang, dict, href }: RecordingCardProps) {
  const { species, date, location, notes } = recording
  const kingdomLabel = dict.kingdoms[species.kingdom] ?? species.kingdom
  const vernacular = lang === 'zh' ? species.vernacularNameZh : species.vernacularNameEn

  return (
    <Link href={href} className="block">
      <article className="flex overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-md">
        <div
          className="w-[3px] shrink-0"
          style={{ backgroundColor: kingdomColor(species.kingdom) }}
        />
        <div className="min-w-0 flex-1 space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="truncate font-medium italic">{species.canonicalName}</p>
              {vernacular && (
                <p className="truncate text-xs text-muted-foreground">{vernacular}</p>
              )}
            </div>
            <KingdomBadge
              kingdom={species.kingdom}
              label={kingdomLabel}
              className="shrink-0"
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3" />
              {formatDate(date, lang)}
            </span>
            {location.placeName && (
              <span className="flex min-w-0 items-center gap-1">
                <MapPinIcon className="size-3 shrink-0" />
                <span className="truncate">{location.placeName}</span>
              </span>
            )}
          </div>
          {notes && (
            <p className="line-clamp-1 text-xs text-muted-foreground">{notes}</p>
          )}
        </div>
      </article>
    </Link>
  )
}
