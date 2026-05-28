'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { MdIcon } from '@/components/ui/MdIcon'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { kingdomColor } from '@/lib/utils/kingdom'
import { cn } from '@/lib/utils'
import type { Kingdom } from '@/lib/models/Species'
import type { Dictionary } from '@/lib/i18n/dictionaries'

const kingdoms: Kingdom[] = ['Animalia', 'Plantae', 'Fungi', 'Protista', 'Monera']

interface CollectionHeaderProps {
  currentKingdom: string | undefined
  lang: string
  dict: Pick<Dictionary, 'nav' | 'kingdoms' | 'collection' | 'header'>
}

export function CollectionHeader({ currentKingdom, lang, dict }: CollectionHeaderProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const base = lang === 'zh' ? '/zh' : '/'
  const addHref = `${lang === 'zh' ? '/zh' : ''}/collection/new`

  function selectKingdom(k: Kingdom | null) {
    setOpen(false)
    router.push(k ? `${base}?kingdom=${k}` : base)
  }

  return (
    <>
      {/* Fixed header — full viewport width, centred content within max-w-sm */}
      <header className="fixed left-0 right-0 top-0 z-50 bg-neutral-100">
        <div className="mx-auto flex max-w-sm lg:max-w-2xl items-center justify-between px-4 py-6">
          {/* Left — title + filter */}
          <div className="flex items-center gap-1">
            <h1 className="text-2xl tracking-tight">{dict.nav.collection}</h1>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(true)}
              aria-label="Filter by kingdom"
            >
              {/* ⚠️ non-shadcn icon: Material Symbols */}
              <MdIcon name="filter_list"/>
            </Button>
          </div>

          {/* Right — search + add */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1 px-2" disabled aria-label="Search">
              {/* ⚠️ non-shadcn icon: Material Symbols */}
              <MdIcon name="search"/>
              {dict.header.search}
            </Button>
            <Link href={addHref} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-2')}>
              {dict.header.add}
            </Link>
          </div>
        </div>
      </header>

      {/* Kingdom filter sheet — shadcn Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom">
          <SheetHeader className="mb-2">
            <SheetTitle className="text-base">Filter</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 pb-6">
            <button
              onClick={() => selectKingdom(null)}
              className={cn(
                'flex items-center rounded-lg px-4 py-3 text-sm text-left transition-colors',
                !currentKingdom ? 'bg-neutral-100 font-medium' : 'hover:bg-neutral-50',
              )}
            >
              {dict.collection.filter_all}
            </button>
            {kingdoms.map((k) => (
              <button
                key={k}
                onClick={() => selectKingdom(k)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-left transition-colors hover:bg-neutral-50',
                  currentKingdom === k && 'font-medium',
                )}
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: kingdomColor(k) }}
                />
                {dict.kingdoms[k]}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
