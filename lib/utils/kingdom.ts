import type { Kingdom } from '@/lib/models/Species'

const colorVars: Record<Kingdom, string> = {
  Animalia: 'var(--kingdom-animal)',
  Plantae: 'var(--kingdom-plant)',
  Fungi: 'var(--kingdom-fungi)',
  Protista: 'var(--kingdom-protist)',
  Monera: 'var(--kingdom-monera)',
}

/** Text colour for use on kingdom-coloured backgrounds. */
const fgVars: Record<Kingdom, string> = {
  Animalia: 'white',
  Plantae: 'white',
  Fungi: 'var(--foreground)',    // light bg → dark text
  Protista: 'white',
  Monera: 'var(--foreground)',   // light bg → dark text
}

export function kingdomColor(kingdom: Kingdom): string {
  return colorVars[kingdom] ?? 'var(--muted)'
}

export function kingdomForeground(kingdom: Kingdom): string {
  return fgVars[kingdom] ?? 'white'
}
