'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { MdIcon } from '@/components/ui/MdIcon'
import { cn } from '@/lib/utils'

export type TaxonZh = {
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
}

export interface GBIFSuggestion {
  key: number
  canonicalName: string
  vernacularName?: string
  vernacularNameZh?: string
  taxonZh?: TaxonZh
  rank?: string
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  species?: string
}

interface TaxonomySearchProps {
  placeholder: string
  triggerLabel: string
  noResults: string
  searching: string
  changeLabel: string
  onSelect: (suggestion: GBIFSuggestion) => void
  onClear: () => void
}

export function TaxonomySearch({
  placeholder,
  triggerLabel,
  noResults,
  searching,
  changeLabel,
  onSelect,
  onClear,
}: TaxonomySearchProps) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<GBIFSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<GBIFSuggestion | null>(null)

  // ── Search via GBIF ───────────────────────────────────────────────────────
  useEffect(() => {
    if (search.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const abort = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/taxonomy?q=${encodeURIComponent(search)}`,
          { signal: abort.signal },
        )
        const data: GBIFSuggestion[] = await res.json()
        setResults(data.filter((s) => s.canonicalName))
      } catch (e) {
        if (!abort.signal.aborted) setResults([])
      } finally {
        if (!abort.signal.aborted) setLoading(false)
      }
    }, 300)
    return () => { clearTimeout(timer); abort.abort() }
  }, [search])

  // ── Select: emit immediately, then resolve zh name in background ──────────
  async function handleSelect(item: GBIFSuggestion) {
    setOpen(false)
    setSearch('')
    setResults([])
    setSelectedItem(item)
    onSelect(item)

    // Fetch zh vernacular name + zh taxonomy from iNaturalist in the background
    try {
      const res = await fetch(
        `/api/taxonomy/resolve?name=${encodeURIComponent(item.canonicalName)}`,
      )
      if (res.ok) {
        const { vernacularNameZh, taxonZh } = await res.json()
        if (vernacularNameZh || taxonZh) {
          onSelect({
            ...item,
            ...(vernacularNameZh ? { vernacularNameZh } : {}),
            ...(taxonZh ? { taxonZh } : {}),
          })
        }
      }
    } catch { /* non-critical — zh data is optional */ }
  }

  function handleReset() {
    setSelectedItem(null)
    setSearch('')
    setResults([])
    setOpen(false)
    onClear()
  }

  return (
    <>
      {selectedItem ? (
        <ButtonGroup className="w-full">
          <ButtonGroupText className="flex-1 min-w-0 px-4 py-2 font-sans-ui">
            <div className="flex flex-col flex-1 gap-0.5 min-w-0">
              {selectedItem.vernacularName ? (
                <>
                  <span className="truncate">{selectedItem.vernacularName}</span>
                  <span className="text-xs text-muted-foreground italic font-normal truncate">{selectedItem.canonicalName}</span>
                </>
              ) : (
                <span className="italic font-normal truncate">{selectedItem.canonicalName}</span>
              )}
            </div>
          </ButtonGroupText>
          <Button type="button" variant="outline" onClick={handleReset} className="h-auto hover:bg-accent font-sans-ui">
            {changeLabel}
          </Button>
        </ButtonGroup>
      ) : (
        <InputGroup onClick={() => setOpen(true)} className="cursor-pointer">
          <InputGroupAddon>
            <MdIcon name="globe_book" size={20} />
          </InputGroupAddon>
          <InputGroupInput
            readOnly
            placeholder={triggerLabel}
            className="text-sm font-sans-ui cursor-pointer"
          />
        </InputGroup>
      )}
      <CommandDialog open={open} onOpenChange={setOpen} className="font-sans-ui">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={placeholder}
          />
          <CommandList className="hide-scrollbar">
            {loading && <CommandEmpty className="text-muted-foreground">{searching}</CommandEmpty>}
            {!loading && search.length >= 2 && results.length === 0 && (
              <CommandEmpty className="text-muted-foreground">{noResults}</CommandEmpty>
            )}
            <CommandGroup className="font-sans-ui">
              {results.map((item) => (
                <CommandItem
                  key={item.key}
                  value={String(item.key)}
                  onSelect={() => handleSelect(item)}
                  className="items-start"
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    {item.vernacularName && (
                      <span className="font-medium truncate">{item.vernacularName}</span>
                    )}
                    <span className={cn('italic truncate', item.vernacularName ? 'text-xs text-muted-foreground' : 'font-normal')}>
                      {item.canonicalName}
                    </span>
                  </div>
                  {item.kingdom && (
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {item.kingdom}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
