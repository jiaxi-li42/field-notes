import type { Kingdom } from '@/lib/models/Species'

const colorVars: Record<Kingdom, string> = {
  Animalia: 'var(--kingdom-animal)',
  Plantae: 'var(--kingdom-plant)',
  Fungi: 'var(--kingdom-fungi)',
  Protista: 'var(--kingdom-protist)',
  Monera: 'var(--kingdom-monera)',
}

export function kingdomColor(kingdom: Kingdom): string {
  return colorVars[kingdom] ?? 'var(--muted)'
}
