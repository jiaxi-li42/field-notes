/**
 * MdIcon — Material Symbols Outlined icon at weight 300.
 * ⚠️ non-shadcn: uses Google Material Symbols web font (not Lucide).
 *
 * font-size and font-variation-settings are applied as inline styles so they
 * always beat the Google Fonts stylesheet in the CSS cascade.
 *
 * Usage: <MdIcon name="filter_list" />
 * Smaller: <MdIcon name="close" size={16} />
 * With colour: <MdIcon name="location_on" className="text-muted-foreground" />
 */
import { cn } from '@/lib/utils'

interface MdIconProps {
  /** Google Material Symbols icon name, e.g. "filter_list", "arrow_back" */
  name: string
  /** Icon size in px. Defaults to 20. */
  size?: number
  className?: string
}

const VARIATION = "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24"

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
