'use client'

import { useEffect, useRef, useState } from 'react'
import { SearchIcon } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface GBIFSuggestion {
  key: number
  canonicalName: string
  vernacularName?: string
  vernacularNameZh?: string
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
  noResults: string
  searching: string
  onSelect: (suggestion: GBIFSuggestion) => void
  onClear: () => void
}

export function TaxonomySearch({
  placeholder,
  noResults,
  searching,
  onSelect,
  onClear,
}: TaxonomySearchProps) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<GBIFSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const justSelectedRef = useRef(false)
  const onClearRef = useRef(onClear)
  onClearRef.current = onClear

  // ── Search via GBIF ───────────────────────────────────────────────────────
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }
    if (search.length < 2) {
      setResults([])
      setOpen(false)
      if (search.length === 0) onClearRef.current()
      return
    }
    setLoading(true)
    setOpen(true)
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

  // ── Click outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Select: emit immediately, then resolve zh name in background ──────────
  async function handleSelect(item: GBIFSuggestion) {
    justSelectedRef.current = true
    setSearch(item.vernacularName || item.canonicalName)
    setOpen(false)

    // Emit with GBIF data right away
    onSelect(item)

    // Fetch zh vernacular name from iNaturalist in the background
    try {
      const res = await fetch(
        `/api/taxonomy/resolve?name=${encodeURIComponent(item.canonicalName)}`,
      )
      if (res.ok) {
        const { vernacularNameZh } = await res.json()
        if (vernacularNameZh) {
          onSelect({ ...item, vernacularNameZh })
        }
      }
    } catch { /* non-critical — zh name is optional */ }
  }

  return (
    <div ref={containerRef} className="relative">
      <Command shouldFilter={false}>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setOpen(true)
            }}
            placeholder={placeholder}
            className="pl-9"
            autoComplete="off"
          />
        </div>
        {open && (
          <div
            className={cn(
              'absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-md',
            )}
          >
            <CommandList>
              {loading && <CommandEmpty>{searching}</CommandEmpty>}
              {!loading && results.length === 0 && (
                <CommandEmpty>{noResults}</CommandEmpty>
              )}
              <CommandGroup>
                {results.map((item) => (
                  <CommandItem
                    key={item.key}
                    value={String(item.key)}
                    onSelect={() => handleSelect(item)}
                  >
                    <div className="flex flex-col">
                      {item.vernacularName && (
                        <span className="font-medium">{item.vernacularName}</span>
                      )}
                      <span className={cn('italic', item.vernacularName ? 'text-xs text-muted-foreground' : 'font-medium')}>
                        {item.canonicalName}
                      </span>
                    </div>
                    {item.kingdom && (
                      <span className="ml-auto self-start text-xs text-muted-foreground">
                        {item.kingdom}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  )
}
