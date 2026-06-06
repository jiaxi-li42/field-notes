import { cn } from '@/lib/utils'

interface PageHeaderProps {
  left: React.ReactNode
  right?: React.ReactNode
  bg?: string
  className?: string
}

/**
 * Fixed top header — shared layout for all pages.
 * Pass `left` (title / back button) and optional `right` (actions).
 * Defaults to `bg-white`; collection page overrides to `bg-neutral-100`.
 */
export function PageHeader({ left, right, bg = 'bg-white', className }: PageHeaderProps) {
  return (
    <header className={cn('fixed left-0 right-0 top-0 z-50', bg, className)}>
      <div className="mx-auto flex max-w-sm md:max-w-2xl items-center justify-between px-4 py-6">
        {left}
        {right && <div className="flex items-center gap-1">{right}</div>}
      </div>
    </header>
  )
}
