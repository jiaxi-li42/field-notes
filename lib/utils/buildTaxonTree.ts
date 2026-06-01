import type { CircleCardData } from '@/components/collection/CollectionView'
import type { Kingdom } from '@/lib/models/Species'

/** Node in the taxonomy tree hierarchy. */
export interface TaxonTreeNode {
  /** Rank value, e.g. "Chordata", "Aves", or species canonical name for leaves. */
  name: string
  /** Taxonomy rank label. */
  rank: 'root' | 'kingdom' | 'phylum' | 'class' | 'order' | 'family' | 'genus' | 'species'
  /** Kingdom this node belongs to (set at phylum-level and below). */
  kingdom?: Kingdom
  /** Index into the sorted CircleCardData array — only on leaf nodes. */
  cardIndex?: number
  /** Child nodes. Absent on leaves. */
  children?: TaxonTreeNode[]
}

/**
 * Build a taxonomy hierarchy from sorted CircleCardData.
 *
 * Structure: root → kingdom → phylum → class → order → family → genus → leaf(species)
 * No collapsing of single-child nodes — all ranks are preserved.
 */
export function buildTaxonTree(cards: CircleCardData[]): TaxonTreeNode {
  const root: TaxonTreeNode = { name: 'Collection', rank: 'root', children: [] }

  // Ranks to traverse — kingdom is now an explicit level in the tree.
  const ranks = ['kingdom', 'phylum', 'taxonomyClass', 'order', 'family', 'genus'] as const
  const rankLabels: Record<string, TaxonTreeNode['rank']> = {
    kingdom: 'kingdom',
    phylum: 'phylum',
    taxonomyClass: 'class',
    order: 'order',
    family: 'family',
    genus: 'genus',
  }

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    let parent = root

    // Walk down the rank path, creating intermediate nodes as needed
    for (const field of ranks) {
      const value = card[field]
      let child = parent.children?.find(c => c.name === value && c.rank === rankLabels[field])
      if (!child) {
        child = {
          name: value,
          rank: rankLabels[field],
          kingdom: card.kingdom,
          children: [],
        }
        parent.children!.push(child)
      }
      parent = child
    }

    // Add leaf (species)
    parent.children!.push({
      name: card.displayName,
      rank: 'species',
      kingdom: card.kingdom,
      cardIndex: i,
    })
  }

  return root
}
