'use client'

import { useEffect, useState } from 'react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { MdIcon } from '@/components/ui/MdIcon'

interface PhotoItem {
  id: string
  url: string
  caption: string
  width: number
  height: number
}

interface PhotoProps {
  photos: PhotoItem[]
}

/* ------------------------------------------------------------------ */
/*  CaptionIcon — bottom-left icon with tooltip                        */
/* ------------------------------------------------------------------ */

function CaptionIcon({ caption }: { caption: string }) {
  const [open, setOpen] = useState(false)
  if (!caption) return null
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        onPointerDown={(e) => { e.stopPropagation(); setOpen(true) }}
        onPointerUp={() => setOpen(false)}
        onPointerLeave={() => setOpen(false)}
        className="absolute bottom-3 left-3 z-10 flex size-7 items-center justify-center rounded-full bg-black/50 text-white cursor-default"
      >
        <MdIcon name="notes" size={16} />
      </TooltipTrigger>
      <TooltipContent side="top" align="start" sideOffset={8} className="max-w-[240px] font-sans-ui">
        {caption}
      </TooltipContent>
    </Tooltip>
  )
}

/* ------------------------------------------------------------------ */
/*  PhotoCarousel — mobile swipeable carousel                          */
/* ------------------------------------------------------------------ */

export function PhotoCarousel({ photos }: PhotoProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [lightbox, setLightbox] = useState<{ url: string; caption: string } | null>(null)

  useEffect(() => {
    if (!api) return
    setCurrent(api.selectedScrollSnap())
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    api.on('select', onSelect)
    return () => { api.off('select', onSelect) }
  }, [api])

  if (photos.length === 0) return null

  return (
    <>
      <Carousel setApi={setApi}>
        <CarouselContent className="ml-0">
          {photos.map((photo) => (
            <CarouselItem key={photo.id} className="pl-0">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption}
                  onClick={() => setLightbox({ url: photo.url, caption: photo.caption })}
                  className="w-full aspect-square object-cover cursor-pointer"
                />
                <CaptionIcon caption={photo.caption} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Page indicator — fixed to carousel (image-only height) */}
        {photos.length > 1 && (
          <span className="absolute bottom-3 right-3 z-10 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white font-sans-ui tabular-nums pointer-events-none">
            {current + 1}/{photos.length}
          </span>
        )}
      </Carousel>

      {/* Lightbox — tap to see original */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt=""
            className="max-h-[80vh] max-w-full object-contain"
          />
          {lightbox.caption && (
            <p className="mt-4 max-w-sm px-4 text-center text-sm text-white font-sans-ui">
              {lightbox.caption}
            </p>
          )}
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  PhotoGrid — desktop orientation-aware grid with tilts              */
/* ------------------------------------------------------------------ */

const ROTATIONS = [-0.8, 0.6, -0.5, 1.0, -0.3, 0.7, -0.9, 0.4, -0.6, 0.8]

export function PhotoGrid({ photos }: PhotoProps) {
  if (photos.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-8">
      {photos.map((photo, i) => {
        const ratio = photo.width && photo.height ? photo.width / photo.height : 1
        const landscape = ratio > 1.1
        const square = !landscape && ratio >= 0.9
        const rotate = ROTATIONS[i % ROTATIONS.length]
        return (
          <figure
            key={photo.id}
            className={`relative ${landscape ? 'col-span-2' : ''}`}
            style={{ transform: `rotate(${rotate}deg)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption}
              className={`w-full object-cover ${landscape ? 'aspect-[4/3]' : square ? 'aspect-square' : 'aspect-[3/4]'}`}
            />
            <CaptionIcon caption={photo.caption} />
          </figure>
        )
      })}
    </div>
  )
}
