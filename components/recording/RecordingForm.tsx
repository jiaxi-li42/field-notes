'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MdIcon } from '@/components/ui/MdIcon'
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TaxonomySearch, type GBIFSuggestion } from '@/components/taxonomy/TaxonomySearch'
import { KingdomBadge } from '@/components/taxonomy/KingdomBadge'
import { createRecording, deleteRecording } from '@/app/actions/recordings'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import type { Kingdom } from '@/lib/models/Species'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface UploadedPhoto {
  id: string
  url: string
  previewUrl: string
  caption: string
  width: number
  height: number
}

function readDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = src
  })
}

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
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const collectionHref = lang === 'zh' ? '/zh' : '/'

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    try {
      const remaining = 10 - uploadedPhotos.length
      const batch = files.slice(0, remaining)
      const results = await Promise.allSettled(
        batch.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          const previewUrl = URL.createObjectURL(file)
          const [res, dims] = await Promise.all([
            fetch('/api/upload', { method: 'POST', body: formData }),
            readDimensions(previewUrl),
          ])
          if (!res.ok) { URL.revokeObjectURL(previewUrl); return null }
          const { id, url } = await res.json()
          return { id, url, previewUrl, caption: '', width: dims.width, height: dims.height } as UploadedPhoto
        }),
      )
      const uploaded = results
        .filter((r): r is PromiseFulfilledResult<UploadedPhoto | null> => r.status === 'fulfilled')
        .map((r) => r.value)
        .filter((v): v is UploadedPhoto => v !== null)
      setUploadedPhotos((prev) => [...prev, ...uploaded].slice(0, 10))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removePhoto(index: number) {
    setUploadedPhotos((prev) => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  function updateCaption(index: number, caption: string) {
    setUploadedPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, caption } : p)),
    )
  }

  // Revoke all blob URLs on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      uploadedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    }
  }, []) // intentionally empty — cleanup runs on unmount only

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
          photos: uploadedPhotos.map((p) => ({ id: p.id, url: p.url, caption: p.caption, width: p.width, height: p.height })),
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
          <MdIcon name="arrow_back" />
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
            <MdIcon name="calendar_today" className="mr-2" />
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
        {uploadedPhotos.length < 10 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-20 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:opacity-50"
          >
            <MdIcon name={uploading ? 'hourglass_empty' : 'add_photo_alternate'} />
            <span>{uploading ? '…' : dict.recording.photos}</span>
          </button>
        )}
        {uploadedPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {uploadedPhotos.map((photo, i) => (
              <div key={photo.id}>
                <div className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt=""
                    className="size-full rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background"
                    aria-label="Remove photo"
                  >
                    <MdIcon name="close" size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  value={photo.caption}
                  onChange={(e) => updateCaption(i, e.target.value)}
                  placeholder={dict.form.caption_placeholder}
                  className="mt-1 w-full border-0 border-b border-transparent bg-transparent px-0 py-0.5 text-xs outline-none placeholder:text-muted-foreground/50 focus:border-border"
                />
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
          disabled={!selectedSpecies || isPending || uploading}
        >
          {isPending ? '…' : dict.actions.save}
        </Button>
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/*  DetailActions — overflow menu for the recording detail page        */
/* ------------------------------------------------------------------ */

interface DetailActionsProps {
  recordingId: string
  editHref: string
  redirectTo: string
  labels: {
    edit: string
    delete: string
    deleteTitle: string
    deleteDescription: string
    deleteConfirm: string
    deletePending: string
    cancel: string
  }
}

export function DetailActions({
  recordingId,
  editHref,
  redirectTo,
  labels,
}: DetailActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [alertOpen, setAlertOpen] = useState(false)

  function handleDelete() {
    startTransition(async () => {
      await deleteRecording(recordingId)
      router.push(redirectTo)
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
            'cursor-pointer',
          )}
          aria-label="More options"
        >
          <MdIcon name="more_horiz" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="bg-neutral-100 font-sans-ui shadow-none ring-0">
          <DropdownMenuItem disabled>
            {labels.edit}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setAlertOpen(true)}
          >
            {labels.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent className="font-sans-ui">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans-ui">{labels.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{labels.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-w-20">{labels.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="min-w-20"
            >
              {isPending ? labels.deletePending : labels.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  BackButton — router.back() so URL params are preserved             */
/* ------------------------------------------------------------------ */

export function BackButton({ label, className }: { label: string; className?: string }) {
  const router = useRouter()
  return (
    <button type="button" onClick={() => router.back()} className={className}>
      {label}
    </button>
  )
}
