'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  left?: React.ReactNode
  right?: React.ReactNode
  bg?: string
  className?: string
}

/** bg Tailwind class → translucent rgba for the frosted-glass state */
const GLASS_BG: Record<string, string> = {
  'bg-white': 'rgba(255,255,255,0.8)',
  'bg-neutral-100': 'rgba(245,245,245,0.8)',
}

export function PageHeader({ left, right, bg = 'bg-white', className }: PageHeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // OverlayScrollbars body-mode intercepts native scroll —
    // events fire on its viewport element, not on `window`.
    // The viewport may not exist on first render, so we listen on
    // both window (immediate fallback) and the viewport (once found).
    // In OS body-mode only the viewport fires, so no double-firing.
    let viewport: HTMLElement | null = null
    let retryId: ReturnType<typeof setTimeout> | undefined

    const onScroll = () => {
      const y = viewport ? viewport.scrollTop : window.scrollY
      setScrolled(y > 0)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    // Try to attach to the OS viewport, retry up to ~2 s
    let attempts = 0
    function tryAttach() {
      viewport = document.querySelector<HTMLElement>(
        '[data-overlayscrollbars-viewport]',
      )
      if (viewport) {
        viewport.addEventListener('scroll', onScroll, { passive: true })
        onScroll()
        return
      }
      if (++attempts < 10) retryId = setTimeout(tryAttach, 200)
    }
    tryAttach()

    return () => {
      if (retryId) clearTimeout(retryId)
      window.removeEventListener('scroll', onScroll)
      viewport?.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 py-6 transition-[background-color,backdrop-filter] duration-300',
        scrolled ? 'backdrop-blur-md' : bg,
        className,
      )}
      style={
        scrolled
          ? { backgroundColor: GLASS_BG[bg] ?? GLASS_BG['bg-white'] }
          : undefined
      }
    >
      <div className="mx-auto flex h-full max-w-md md:max-w-2xl items-center justify-between px-4">
        {left}
        {right && <div className="ml-auto flex items-center gap-1">{right}</div>}
      </div>
    </header>
  )
}
