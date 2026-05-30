import { Badge } from '@/components/ui/badge'
import { kingdomColor, kingdomForeground } from '@/lib/utils/kingdom'
import type { Kingdom } from '@/lib/models/Species'

interface KingdomBadgeProps {
  kingdom: Kingdom
  label: string
  className?: string
}

export function KingdomBadge({ kingdom, label, className }: KingdomBadgeProps) {
  return (
    <Badge
      className={className}
      style={{ backgroundColor: kingdomColor(kingdom), color: kingdomForeground(kingdom), borderColor: 'transparent' }}
    >
      {label}
    </Badge>
  )
}
