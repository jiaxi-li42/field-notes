// Inline styles beat the Google Fonts stylesheet in the cascade
import { cn } from '@/lib/utils'

interface MdIconProps {
  /** Google Material Symbols icon name, e.g. "filter_list", "arrow_back" */
  name: string
  /** Icon size in px. Defaults to 20. */
  size?: number
  className?: string
}

const VARIATION = "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 24"

export function MdIcon({ name, size = 20, className }: MdIconProps) {
  return (
    <span
      className={cn('material-symbols-outlined', className)}
      style={{ fontSize: size, fontVariationSettings: VARIATION }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
