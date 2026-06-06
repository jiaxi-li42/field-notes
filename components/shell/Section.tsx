import { cn } from '@/lib/utils'

interface SectionProps {
  label: string
  /** Add flex column + gap for form inputs. Default: false (inline text). */
  form?: boolean
  children: React.ReactNode
}

/**
 * Responsive label + content row — shared by detail page and recording form.
 * Mobile: label above content. Desktop: 1/3 label + 2/3 content grid.
 */
export function Section({ label, form, children }: SectionProps) {
  return (
    <div className="py-4 md:grid md:grid-cols-3">
      <span className="block mb-2 md:mb-0 text-xs font-bold text-muted-foreground lowercase">{label}</span>
      <div className={cn('text-sm font-sans-ui md:col-span-2', form && 'flex flex-col gap-2')}>{children}</div>
    </div>
  )
}
