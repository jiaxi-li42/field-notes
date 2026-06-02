'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Button, buttonVariants } from '@/components/ui/button'
import { MdIcon } from '@/components/ui/MdIcon'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import { langPrefix } from '@/lib/utils/i18n'

interface CollectionHeaderProps {
  lang: string
  dict: Pick<Dictionary, 'nav' | 'header' | 'auth'>
}

export function CollectionHeader({ lang, dict }: CollectionHeaderProps) {
  const prefix = langPrefix(lang)
  const addHref = `${prefix}/collection/new`

  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-neutral-100">
      <div className="mx-auto flex max-w-sm md:max-w-2xl items-center justify-between px-4 py-6">
        {/* Left -- title + overflow menu */}
        <div className="flex items-center gap-1">
          <h1 className="text-2xl tracking-tight">{dict.nav.collection}</h1>

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                'cursor-pointer',
              )}
              aria-label="More options"
            >
              <MdIcon name="more_horiz" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" sideOffset={6} className="font-sans-ui shadow-none ring-0">
              <DropdownMenuItem disabled>
                {dict.header.profile}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                {dict.header.settings}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                {dict.auth.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right -- search + add */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1 px-2" disabled aria-label="Search">
            <MdIcon name="search" />
            {dict.header.search}
          </Button>
          <Link href={addHref} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-2')}>
            {dict.header.add}
          </Link>
        </div>
      </div>
    </header>
  )
}
