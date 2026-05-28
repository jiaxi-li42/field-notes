import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { kingdomColor } from '@/lib/utils/kingdom'
import { cn } from '@/lib/utils'
import type { Kingdom } from '@/lib/models/Species'
import type { Dictionary } from '@/lib/i18n/dictionaries'

const kingdoms: Kingdom[] = ['Animalia', 'Plantae', 'Fungi', 'Protista', 'Monera']

interface KingdomFilterProps {
  currentKingdom: string | undefined
  base: string
  dict: Pick<Dictionary, 'kingdoms' | 'collection'>
}

export function KingdomFilter({ currentKingdom, base, dict }: KingdomFilterProps) {
  const allHref = base
  const isAll = !currentKingdom

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      <Link
        href={allHref}
        className={cn(
          buttonVariants({ variant: isAll ? 'default' : 'outline', size: 'sm' }),
          'shrink-0 rounded-full',
        )}
      >
        {dict.collection.filter_all}
      </Link>
      {kingdoms.map((k) => {
        const isActive = currentKingdom === k
        return (
          <Link
            key={k}
            href={`${base}?kingdom=${k}`}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'shrink-0 rounded-full',
            )}
            style={
              isActive
                ? {
                    backgroundColor: kingdomColor(k),
                    color: 'white',
                    borderColor: 'transparent',
                  }
                : {}
            }
          >
            {dict.kingdoms[k]}
          </Link>
        )
      })}
    </div>
  )
}
