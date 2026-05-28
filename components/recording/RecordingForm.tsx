'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, CalendarIcon, ImagePlusIcon, XIcon } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { TaxonomySearch, type GBIFSuggestion } from '@/components/taxonomy/TaxonomySearch'
import { KingdomBadge } from '@/components/taxonomy/KingdomBadge'
import { createRecording } from '@/app/actions/recordings'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import type { Kingdom } from '@/lib/models/Species'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface RecordingFormProps {
  lang: string
  dict: Pick<Dictionary, 'nav' | 'recording' | 'actions' | 'form' | 'kingdoms'>
}

export function RecordingForm({ lang, dict }: RecordingFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedSpecies, setSelectedSpecies] = useState<GBIFSuggestion | null>(null)
  const [date, setDate] = useState<Date>(new Date())
  const [calOpen, setCalOpen] = useState(false)
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const collectionHref = lang === 'zh' ? '/zh' : '/'

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews((prev) => [...prev, ...urls].slice(0, 10))
  }

  function removePhoto(index: number) {
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSpecies) return
    setError(null)

    startTransition(async () => {
      try {
        await createRecording({
          speciesGbifKey: selectedSpecies.key,
          speciesCanonicalName: selectedSpecies.canonicalName,
          speciesVernacularEn: '',
          speciesVernacularZh: '',
          speciesKingdom: selectedSpecies.kingdom ?? 'Animalia',
          taxonPhylum: selectedSpecies.phylum ?? '',
          taxonClass: selectedSpecies.class ?? '',
          taxonOrder: selectedSpecies.order ?? '',
          taxonFamily: selectedSpecies.family ?? '',
          taxonGenus: selectedSpecies.genus ?? '',
          taxonSpecies: selectedSpecies.species ?? '',
          date: date.toISOString(),
          locationPlaceName: location,
          notes,
        })
        router.push(collectionHref)
      } catch {
        setError(dict.form.save_error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Header */}
      <div className="flex items-center gap-2 pb-4">
        <Link
          href={collectionHref}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
          aria-label={dict.nav.collection}
        >
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">{dict.nav.new}</h1>
      </div>

      <Separator />

      {/* Species */}
      <div className="space-y-2 py-5">
        <label className="text-sm font-medium">{dict.recording.species}</label>
        <TaxonomySearch
          placeholder={dict.form.species_placeholder}
          noResults={dict.form.no_results}
          searching={dict.form.searching}
          onSelect={(s) => setSelectedSpecies(s)}
          onClear={() => setSelectedSpecies(null)}
        />
        {selectedSpecies?.kingdom && (
          <div className="flex items-center gap-2 pt-1">
            <KingdomBadge
              kingdom={selectedSpecies.kingdom as Kingdom}
              label={dict.kingdoms[selectedSpecies.kingdom] ?? selectedSpecies.kingdom}
            />
            <span className="text-sm text-muted-foreground italic">
              {selectedSpecies.canonicalName}
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Date */}
      <div className="space-y-2 py-5">
        <label className="text-sm font-medium">{dict.recording.date}</label>
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full justify-start font-normal',
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {formatDate(date, lang)}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (d) {
                  setDate(d)
                  setCalOpen(false)
                }
              }}
              disabled={(d) => d > new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Separator />

      {/* Location */}
      <div className="space-y-2 py-5">
        <label className="text-sm font-medium">{dict.recording.location}</label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={dict.form.location_placeholder}
        />
      </div>

      <Separator />

      {/* Photos */}
      <div className="space-y-2 py-5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">{dict.recording.photos}</label>
          <span className="text-xs text-muted-foreground">{dict.form.photos_hint}</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="sr-only"
          onChange={handleFiles}
        />
        {previews.length < 10 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
          >
            <ImagePlusIcon className="size-5" />
            <span>{dict.recording.photos}</span>
          </button>
        )}
        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {previews.map((url, i) => (
              <div key={url} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="size-full rounded-md object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background"
                  aria-label="Remove photo"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Notes */}
      <div className="space-y-2 py-5">
        <label className="text-sm font-medium">{dict.recording.notes}</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={dict.form.notes_placeholder}
          rows={4}
        />
      </div>

      {error && <p className="text-sm text-destructive pb-3">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Link
          href={collectionHref}
          className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}
        >
          {dict.actions.cancel}
        </Link>
        <Button
          type="submit"
          className="flex-1"
          disabled={!selectedSpecies || isPending}
        >
          {isPending ? '…' : dict.actions.save}
        </Button>
      </div>
    </form>
  )
}
