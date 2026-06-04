'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MdIcon } from '@/components/ui/MdIcon'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import {
  FieldGroup,
  Field,
  FieldContent,
  FieldLabel,
  FieldTitle,
  FieldDescription,
} from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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

/* ------------------------------------------------------------------ */
/*  FieldLabel style override — match detail page section labels       */
/* ------------------------------------------------------------------ */

const fieldLabelClass = 'text-xs font-bold text-muted-foreground lowercase'

/* ------------------------------------------------------------------ */
/*  RecordingForm                                                      */
/* ------------------------------------------------------------------ */

interface RecordingFormProps {
  lang: string
  dict: Pick<Dictionary, 'nav' | 'recording' | 'actions' | 'form' | 'kingdoms' | 'detail' | 'ranks'>
}

export function RecordingForm({ lang, dict }: RecordingFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedSpecies, setSelectedSpecies] = useState<GBIFSuggestion | null>(null)
  const [manualTaxonomy, setManualTaxonomy] = useState(false)
  const [nameFields, setNameFields] = useState({ common: '', commonEn: '', scientific: '' })
  const [taxonFields, setTaxonFields] = useState({
    kingdom: '', phylum: '', class: '', order: '', family: '', genus: '', species: '',
  })
  const [taxonFieldsZh, setTaxonFieldsZh] = useState({
    kingdom: '', phylum: '', class: '', order: '', family: '', genus: '',
  })
  const [date, setDate] = useState<Date>(new Date())
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync auto-filled fields when species changes
  useEffect(() => {
    if (selectedSpecies && !manualTaxonomy) {
      setNameFields({
        common: (lang === 'zh'
          ? selectedSpecies.vernacularNameZh
          : selectedSpecies.vernacularName) ?? '',
        commonEn: selectedSpecies.vernacularName ?? '',
        scientific: selectedSpecies.canonicalName ?? '',
      })
      setTaxonFields({
        kingdom: selectedSpecies.kingdom ?? '',
        phylum: selectedSpecies.phylum ?? '',
        class: selectedSpecies.class ?? '',
        order: selectedSpecies.order ?? '',
        family: selectedSpecies.family ?? '',
        genus: selectedSpecies.genus ?? '',
        species: selectedSpecies.species ?? '',
      })
      const zh = selectedSpecies.taxonZh
      setTaxonFieldsZh({
        kingdom: zh?.kingdom ?? '',
        phylum: zh?.phylum ?? '',
        class: zh?.class ?? '',
        order: zh?.order ?? '',
        family: zh?.family ?? '',
        genus: zh?.genus ?? '',
      })
    }
  }, [selectedSpecies, manualTaxonomy])

  // When switching to auto-fill, reset to GBIF data
  function selectAutoFill() {
    setManualTaxonomy(false)
    if (selectedSpecies) {
      setNameFields({
        common: (lang === 'zh'
          ? selectedSpecies.vernacularNameZh
          : selectedSpecies.vernacularName) ?? '',
        commonEn: selectedSpecies.vernacularName ?? '',
        scientific: selectedSpecies.canonicalName ?? '',
      })
      setTaxonFields({
        kingdom: selectedSpecies.kingdom ?? '',
        phylum: selectedSpecies.phylum ?? '',
        class: selectedSpecies.class ?? '',
        order: selectedSpecies.order ?? '',
        family: selectedSpecies.family ?? '',
        genus: selectedSpecies.genus ?? '',
        species: selectedSpecies.species ?? '',
      })
      const zh = selectedSpecies.taxonZh
      setTaxonFieldsZh({
        kingdom: zh?.kingdom ?? '',
        phylum: zh?.phylum ?? '',
        class: zh?.class ?? '',
        order: zh?.order ?? '',
        family: zh?.family ?? '',
        genus: zh?.genus ?? '',
      })
    }
  }

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
        // In auto-fill mode, read taxonomy directly from selectedSpecies
        // (taxonFields depends on useEffect and may not have synced yet).
        const tx = manualTaxonomy ? taxonFields : {
          kingdom: selectedSpecies.kingdom ?? '',
          phylum: selectedSpecies.phylum ?? '',
          class: selectedSpecies.class ?? '',
          order: selectedSpecies.order ?? '',
          family: selectedSpecies.family ?? '',
          genus: selectedSpecies.genus ?? '',
          species: selectedSpecies.species ?? '',
        }
        const txZh = lang === 'zh'
          ? (manualTaxonomy ? taxonFieldsZh : {
              kingdom: selectedSpecies.taxonZh?.kingdom ?? '',
              phylum: selectedSpecies.taxonZh?.phylum ?? '',
              class: selectedSpecies.taxonZh?.class ?? '',
              order: selectedSpecies.taxonZh?.order ?? '',
              family: selectedSpecies.taxonZh?.family ?? '',
              genus: selectedSpecies.taxonZh?.genus ?? '',
            })
          : { kingdom: '', phylum: '', class: '', order: '', family: '', genus: '' }
        await createRecording({
          speciesGbifKey: selectedSpecies.key,
          speciesCanonicalName: manualTaxonomy
            ? nameFields.scientific || `${tx.genus} ${tx.species}`.trim()
            : selectedSpecies.canonicalName,
          speciesVernacularEn: manualTaxonomy
            ? (lang === 'zh' ? nameFields.commonEn : nameFields.common)
            : (selectedSpecies.vernacularName ?? ''),
          speciesVernacularZh: lang === 'zh'
            ? (manualTaxonomy ? nameFields.common : (selectedSpecies.vernacularNameZh ?? ''))
            : '',
          speciesKingdom: tx.kingdom || (selectedSpecies.kingdom ?? 'Animalia'),
          taxonPhylum: tx.phylum,
          taxonClass: tx.class,
          taxonOrder: tx.order,
          taxonFamily: tx.family,
          taxonGenus: tx.genus,
          taxonSpecies: tx.species,
          taxonKingdomZh: txZh.kingdom,
          taxonPhylumZh: txZh.phylum,
          taxonClassZh: txZh.class,
          taxonOrderZh: txZh.order,
          taxonFamilyZh: txZh.family,
          taxonGenusZh: txZh.genus,
          date: date.toISOString(),
          locationPlaceName: location,
          notes,
          photos: uploadedPhotos.map((p) => ({ id: p.id, url: p.url, caption: p.caption, width: p.width, height: p.height })),
        })
        router.back()
      } catch {
        setError(dict.form.save_error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Header — fixed */}
      <header className="fixed left-0 right-0 top-0 z-50">
        <div className="mx-auto flex max-w-sm md:max-w-2xl items-center justify-between px-4 py-6">
          {/* Left — title */}
          <h1 className="text-2xl tracking-tight">{dict.nav.new}</h1>

          {/* Right — cancel + save */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => router.back()}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-2 lowercase')}
            >
              {dict.actions.cancel}
            </button>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="px-2 lowercase"
              disabled={!selectedSpecies || isPending || uploading}
            >
              {isPending ? '…' : dict.actions.save}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-sm md:max-w-2xl px-4 pt-20">
        <FieldGroup className="divide-y divide-border gap-0">

          {/* Species */}
          <Field className="py-4">
            <FieldLabel className={fieldLabelClass}>{dict.recording.species}</FieldLabel>
            <TaxonomySearch
              placeholder={dict.form.species_placeholder}
              noResults={dict.form.no_results}
              searching={dict.form.searching}
              onSelect={(s) => setSelectedSpecies(s)}
              onClear={() => setSelectedSpecies(null)}
            />
            {selectedSpecies?.kingdom && (
              <div className="flex items-center gap-2">
                <KingdomBadge
                  kingdom={selectedSpecies.kingdom as Kingdom}
                  label={dict.kingdoms[selectedSpecies.kingdom] ?? selectedSpecies.kingdom}
                />
                <span className="text-sm text-muted-foreground italic font-sans-ui">
                  {selectedSpecies.canonicalName}
                </span>
              </div>
            )}

            {/* Choice Card — auto-fill vs manual */}
            {selectedSpecies && (
              <RadioGroup
                value={manualTaxonomy ? 'manual' : 'auto'}
                onValueChange={(v) => {
                  if (v === 'auto') selectAutoFill()
                  else setManualTaxonomy(true)
                }}
              >
                <FieldLabel htmlFor="auto-fill">
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle className="font-sans-ui">{dict.form.auto_fill}</FieldTitle>
                      <FieldDescription className="font-sans-ui">{dict.form.auto_fill_hint}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value="auto" id="auto-fill" />
                  </Field>
                </FieldLabel>
                <FieldLabel htmlFor="manual-entry">
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle className="font-sans-ui">{dict.form.manual_entry}</FieldTitle>
                      <FieldDescription className="font-sans-ui">{dict.form.manual_entry_hint}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value="manual" id="manual-entry" />
                  </Field>
                </FieldLabel>
              </RadioGroup>
            )}

            {/* Manual taxonomy inputs */}
            {selectedSpecies && manualTaxonomy && (
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-muted-foreground font-sans-ui">{dict.form.common_name}</span>
                  <Input
                    value={nameFields.common}
                    onChange={(e) => setNameFields((prev) => ({ ...prev, common: e.target.value }))}
                    className="h-8 text-sm font-sans-ui"
                  />
                </div>
                {lang === 'zh' && (
                  <div className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs text-muted-foreground font-sans-ui">俗名（英文）</span>
                    <Input
                      value={nameFields.commonEn}
                      onChange={(e) => setNameFields((prev) => ({ ...prev, commonEn: e.target.value }))}
                      className="h-8 text-sm font-sans-ui"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-muted-foreground font-sans-ui">{dict.form.scientific_name}</span>
                  <Input
                    value={nameFields.scientific}
                    onChange={(e) => setNameFields((prev) => ({ ...prev, scientific: e.target.value }))}
                    className="h-8 text-sm font-sans-ui italic"
                  />
                </div>
                {(['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'] as const).map((rank) => (
                  <div key={rank} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs text-muted-foreground font-sans-ui">{dict.ranks[rank]}</span>
                    {lang === 'zh' && rank !== 'species' && (
                      <Input
                        value={taxonFieldsZh[rank]}
                        onChange={(e) => setTaxonFieldsZh((prev) => ({ ...prev, [rank]: e.target.value }))}
                        className="h-8 text-sm font-sans-ui"
                      />
                    )}
                    <Input
                      value={taxonFields[rank]}
                      onChange={(e) => setTaxonFields((prev) => ({ ...prev, [rank]: e.target.value }))}
                      className="h-8 text-sm font-sans-ui italic"
                    />
                  </div>
                ))}
              </div>
            )}
          </Field>

          {/* Notes */}
          <Field className="py-4">
            <FieldLabel className={fieldLabelClass}>{dict.recording.notes}</FieldLabel>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={dict.form.notes_placeholder}
              className="font-sans-ui"
              rows={4}
            />
          </Field>

          {/* Date Added */}
          <Field className="py-4">
            <FieldLabel className={fieldLabelClass}>{dict.detail.date_added}</FieldLabel>
            <Popover>
              <PopoverTrigger
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-start font-normal font-sans-ui')}
              >
                <MdIcon name="calendar_today" className="mr-2" />
                {formatDate(date, lang)}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { if (d) setDate(d) }}
                  disabled={(d) => d > new Date()}
                />
              </PopoverContent>
            </Popover>
          </Field>

          {/* Observed Location */}
          <Field className="py-4">
            <FieldLabel className={fieldLabelClass}>{dict.detail.observed_location}</FieldLabel>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={dict.form.location_placeholder}
              className="font-sans-ui"
            />
          </Field>

          {/* Photos */}
          <Field className="py-4">
            <div className="flex items-center justify-between">
              <FieldLabel className={fieldLabelClass}>{dict.recording.photos}</FieldLabel>
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
          </Field>

        </FieldGroup>

        {error && <p className="text-sm text-destructive pt-4">{error}</p>}
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
  labels,
}: DetailActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [alertOpen, setAlertOpen] = useState(false)

  function handleDelete() {
    startTransition(async () => {
      await deleteRecording(recordingId)
      router.back()
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
