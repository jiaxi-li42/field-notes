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
  Field,
  FieldContent,
  FieldLabel,
  FieldTitle,
  FieldDescription,
} from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { TaxonomySearch, type GBIFSuggestion } from '@/components/taxonomy/TaxonomySearch'
import { createRecording, updateRecording } from '@/app/actions/recordings'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import { langPrefix } from '@/lib/utils/i18n'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import { PHOTO_ROTATIONS } from '@/lib/utils/photo'

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
const fieldInputClass = 'h-8 text-sm rounded-none border-0 border-b border-input focus-visible:ring-0 focus-visible:border-ring'
const fieldInputItalic = cn(fieldInputClass, 'italic')

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-4 md:grid md:grid-cols-3">
      <span className={cn(fieldLabelClass, 'block mb-2 md:mb-0')}>{label}</span>
      <div className="flex flex-col gap-2 md:col-span-2 font-sans-ui">{children}</div>
    </div>
  )
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-0">
      <span className="md:w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 flex-1">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  RecordingForm                                                      */
/* ------------------------------------------------------------------ */

export interface RecordingInitialData {
  recordingId: string
  species: GBIFSuggestion
  nameFields: { common: string; commonEn: string; scientific: string }
  taxonFields: { kingdom: string; phylum: string; class: string; order: string; family: string; genus: string; species: string }
  taxonFieldsZh: { kingdom: string; phylum: string; class: string; order: string; family: string; genus: string }
  date: Date
  location: string
  notes: string
  photos: UploadedPhoto[]
}

interface RecordingFormProps {
  lang: string
  dict: Pick<Dictionary, 'nav' | 'recording' | 'actions' | 'form' | 'kingdoms' | 'detail' | 'ranks' | 'header'>
  initialData?: RecordingInitialData
}

export function RecordingForm({ lang, dict, initialData }: RecordingFormProps) {
  const isEdit = !!initialData
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedSpecies, setSelectedSpecies] = useState<GBIFSuggestion | null>(initialData?.species ?? null)
  const [manualTaxonomy, setManualTaxonomy] = useState(isEdit)
  const [nameFields, setNameFields] = useState(initialData?.nameFields ?? { common: '', commonEn: '', scientific: '' })
  const [taxonFields, setTaxonFields] = useState(
    initialData?.taxonFields ?? { kingdom: '', phylum: '', class: '', order: '', family: '', genus: '', species: '' },
  )
  const [taxonFieldsZh, setTaxonFieldsZh] = useState(
    initialData?.taxonFieldsZh ?? { kingdom: '', phylum: '', class: '', order: '', family: '', genus: '' },
  )
  const [date, setDate] = useState<Date>(initialData?.date ?? new Date())
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>(initialData?.photos ?? [])
  const [uploading, setUploading] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [captionPopoverIndex, setCaptionPopoverIndex] = useState<number | null>(null)
  const [captionDraft, setCaptionDraft] = useState('')
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** Populate name + taxon fields from the selected GBIF suggestion. */
  function applySpeciesFields(s: GBIFSuggestion) {
    setNameFields({
      common: (lang === 'zh' ? s.vernacularNameZh : s.vernacularName) ?? '',
      commonEn: s.vernacularName ?? '',
      scientific: s.canonicalName ?? '',
    })
    setTaxonFields({
      kingdom: s.kingdom ?? '', phylum: s.phylum ?? '', class: s.class ?? '',
      order: s.order ?? '', family: s.family ?? '', genus: s.genus ?? '',
      species: s.species ?? '',
    })
    const zh = s.taxonZh
    setTaxonFieldsZh({
      kingdom: zh?.kingdom ?? '', phylum: zh?.phylum ?? '', class: zh?.class ?? '',
      order: zh?.order ?? '', family: zh?.family ?? '', genus: zh?.genus ?? '',
    })
  }

  // Sync auto-filled fields when species changes
  useEffect(() => {
    if (selectedSpecies && !manualTaxonomy) applySpeciesFields(selectedSpecies)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpecies, manualTaxonomy])

  // When switching to auto-fill, reset to GBIF data
  function selectAutoFill() {
    setManualTaxonomy(false)
    if (selectedSpecies) applySpeciesFields(selectedSpecies)
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
      setUploadedPhotos((prev) => [...uploaded, ...prev].slice(0, 10))
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

  function buildPayload() {
    if (!selectedSpecies) return null
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
    return {
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
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = buildPayload()
    if (!payload) return
    setError(null)

    const base = langPrefix(lang) || '/'
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateRecording(initialData.recordingId, payload)
          router.replace(`${base === '/' ? '' : base}/collection/${initialData.recordingId}`)
        } else {
          await createRecording(payload)
          router.replace(base)
        }
      } catch {
        setError(dict.form.save_error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate onClick={() => setActivePhotoIndex(null)}>
      {/* Header — fixed */}
      <header className="fixed left-0 right-0 top-0 z-50">
        <div className="mx-auto flex max-w-sm md:max-w-2xl items-center justify-between px-4 py-6 bg-white">
          {/* Left — title */}
          <h1 className="text-2xl tracking-tight">{isEdit ? dict.nav.edit : dict.nav.new}</h1>

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
              {isPending ? dict.actions.saving : dict.actions.save}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-sm md:max-w-2xl px-4 pt-16 pb-4">
        <div>

          {/* Species */}
          <FormSection label={dict.recording.species}>
            <div>
              <TaxonomySearch
                placeholder={dict.form.species_placeholder}
                triggerLabel={dict.form.species_trigger}
                noResults={dict.form.no_results}
                searching={dict.form.searching}
                changeLabel={dict.form.change}
                onSelect={(s) => setSelectedSpecies(s)}
                onClear={() => {
                  setSelectedSpecies(null)
                  setManualTaxonomy(false)
                }}
                initialSelected={initialData?.species}
                showReset={!isEdit}
              />

              {/* Selected species display */}
              {selectedSpecies && (() => {
                const vernacular = lang === 'zh' ? selectedSpecies.vernacularNameZh : selectedSpecies.vernacularName
                return (
                  <div className={cn('stamp-card-bottom bg-neutral-100', isEdit && 'stamp-card-top')}>
                    {!isEdit && <div className="border-t border-dashed border-border" />}
                    <div className="flex items-start justify-between gap-4 px-4 py-4">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-2xl font-bold tracking-tight font-sans">
                          {vernacular || selectedSpecies.canonicalName}
                        </span>
                        {vernacular && (
                          <span className="text-sm text-muted-foreground font-sans-ui italic">{selectedSpecies.canonicalName}</span>
                        )}
                      </div>
                      {selectedSpecies.kingdom && (
                        <span className="shrink-0 text-sm text-muted-foreground">{selectedSpecies.kingdom}</span>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Choice Card — auto-fill vs manual (create mode only) */}
            {!isEdit && selectedSpecies && (
              <div className="pt-2">
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
                        <FieldTitle>{dict.form.auto_fill}</FieldTitle>
                        <FieldDescription>{dict.form.auto_fill_hint}</FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value="auto" id="auto-fill" />
                    </Field>
                  </FieldLabel>
                  <FieldLabel htmlFor="manual-entry">
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>{dict.form.manual_entry}</FieldTitle>
                        <FieldDescription>{dict.form.manual_entry_hint}</FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value="manual" id="manual-entry" />
                    </Field>
                  </FieldLabel>
                </RadioGroup>
              </div>
            )}

            {/* Taxonomy inputs — always visible in edit mode, manual toggle in create mode */}
            {selectedSpecies && (isEdit || manualTaxonomy) && (
              <div className="flex flex-col pt-2 gap-3">
                <LabeledField label={dict.form.common_name}>
                  <Input
                    value={nameFields.common}
                    onChange={(e) => setNameFields((prev) => ({ ...prev, common: e.target.value }))}
                    className={fieldInputClass}
                  />
                </LabeledField>
                {lang === 'zh' && (
                  <LabeledField label={dict.form.common_name_en}>
                    <Input
                      value={nameFields.commonEn}
                      onChange={(e) => setNameFields((prev) => ({ ...prev, commonEn: e.target.value }))}
                      className={fieldInputClass}
                    />
                  </LabeledField>
                )}
                <LabeledField label={dict.form.scientific_name}>
                  <Input
                    value={nameFields.scientific}
                    onChange={(e) => setNameFields((prev) => ({ ...prev, scientific: e.target.value }))}
                    className={fieldInputItalic}
                  />
                </LabeledField>
                {(['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'] as const).map((rank) => (
                  <LabeledField key={rank} label={dict.ranks[rank]}>
                    {lang === 'zh' && rank !== 'species' && (
                      <Input
                        value={taxonFieldsZh[rank]}
                        onChange={(e) => setTaxonFieldsZh((prev) => ({ ...prev, [rank]: e.target.value }))}
                        className={fieldInputClass}
                      />
                    )}
                    <Input
                      value={taxonFields[rank]}
                      onChange={(e) => setTaxonFields((prev) => ({ ...prev, [rank]: e.target.value }))}
                      className={fieldInputItalic}
                    />
                  </LabeledField>
                ))}
              </div>
            )}
          </FormSection>

          {/* Notes */}
          <FormSection label={dict.recording.notes}>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={dict.form.notes_placeholder}
              className={fieldInputClass}
              rows={4}
            />
          </FormSection>

          {/* Date Added */}
          <FormSection label={dict.detail.date_added}>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger render={
                <Button variant="outline" className="w-full justify-between text-left font-normal" />
              }>
                <span className="flex items-center gap-2">
                  <MdIcon name="calendar_today" size={16} />
                  {formatDate(date, lang)}
                </span>
                <MdIcon name="keyboard_arrow_down" size={18} className="text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 font-sans-ui" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { if (d) { setDate(d); setCalendarOpen(false) } }}
                  disabled={(d) => d > new Date()}
                />
              </PopoverContent>
            </Popover>
          </FormSection>

          {/* Observed Location */}
          <FormSection label={dict.detail.observed_location}>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={dict.form.location_placeholder}
              className={fieldInputClass}
            />
          </FormSection>

          {/* Photos */}
          <FormSection label={dict.recording.photos}>
            <span className="text-sm text-muted-foreground">{dict.form.photos_hint}</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="sr-only"
              onChange={handleFiles}
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {/* Add tile */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || uploadedPhotos.length >= 10}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:pointer-events-none disabled:opacity-50"              >
                <MdIcon name="note_stack_add" size={24} />
                <span>{uploading ? dict.actions.uploading : dict.header.add}</span>
              </button>
              {/* Uploaded photos */}
              {uploadedPhotos.map((photo, i) => (
                <div
                  key={photo.id}
                  className="flex flex-col items-center gap-1"
                  style={{ transform: `rotate(${PHOTO_ROTATIONS[i % PHOTO_ROTATIONS.length]}deg)` }}
                >
                  <div
                    className="group/photo relative aspect-square w-full overflow-hidden rounded-xl"
                    onClick={(e) => { e.stopPropagation(); setActivePhotoIndex(activePhotoIndex === i ? null : i) }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.previewUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); removePhoto(i) }}
                      className={cn(
                        'absolute inset-0 m-auto w-fit bg-red-100 text-destructive hover:bg-red-200 transition-opacity',
                        activePhotoIndex === i ? 'opacity-100' : 'opacity-0 pointer-events-none',
                        'md:opacity-0 md:pointer-events-auto md:group-hover/photo:opacity-100',
                      )}
                    >
                      <MdIcon name="delete" size={14} />
                      {dict.actions.delete}
                    </Button>
                  </div>
                  <Popover
                    open={captionPopoverIndex === i}
                    onOpenChange={(open) => {
                      if (open) {
                        setCaptionPopoverIndex(i)
                        setCaptionDraft(photo.caption)
                      } else {
                        updateCaption(i, captionDraft)
                        setCaptionPopoverIndex(null)
                      }
                    }}
                  >
                    <PopoverTrigger render={
                      <Button type="button" variant="secondary" size="sm" />
                    }>
                      {photo.caption ? (
                        <>
                          <MdIcon name="check" size={14} />
                          {dict.form.caption_added}
                        </>
                      ) : (
                        dict.form.add_caption
                      )}
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2 font-sans-ui" align="center">
                      <Input
                        value={captionDraft}
                        onChange={(e) => setCaptionDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); updateCaption(i, captionDraft); setCaptionPopoverIndex(null) } }}
                        placeholder={dict.form.caption_placeholder}
                        className="text-sm"
                        ref={(el) => el?.focus({ preventScroll: true })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
            </div>
          </FormSection>

        </div>

        {error && <p className="text-sm text-destructive pt-4">{error}</p>}
      </div>
    </form>
  )
}
