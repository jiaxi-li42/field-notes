import Link from 'next/link'
import type { Recording } from '@/lib/models/Recording'

interface StampCardProps {
  recording: Recording
  lang: string
  href: string
  /** Rotation in degrees — applied via CSS custom property so hover can override it cleanly. */
  rotate?: number
}

export function StampCard({ recording, lang, href, rotate = 0 }: StampCardProps) {
  const { species, photos } = recording
  const vernacular = lang === 'zh' ? species.vernacularNameZh : species.vernacularNameEn
  const displayName = vernacular || species.canonicalName
  const photo = photos[0]

  return (
    <Link
      href={href}
      className="stamp-wrapper"
      style={{ '--stamp-r': `${rotate}deg` } as React.CSSProperties}
    >
      <div className="stamp-card aspect-[3/4] overflow-hidden">
        <div className="flex h-full flex-col justify-between p-0.5">
          {/* Photo — 1:1 inside a 3:4 card */}
          <div className="aspect-square w-full shrink-0 overflow-hidden bg-neutral-200">
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {/* Species name — max 2 lines.
              en: font-bold (700) with NanumMyeongjo
              zh: auto-downgraded to medium (500) via globals.css */}
          <p className="pr-2 pb-0.5 line-clamp-2 text-xs font-bold leading-tight">
            {displayName}
          </p>
        </div>
      </div>
    </Link>
  )
}
