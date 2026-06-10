'use client'

import { useEffect, useState } from 'react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'

interface LightboxPhoto {
  id: string
  url: string
  caption: string
}

interface LightboxProps {
  photos: LightboxPhoto[]
  startIndex: number
  onClose: () => void
}

export function Lightbox({ photos, startIndex, onClose }: LightboxProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(startIndex)

  useEffect(() => {
    if (!api) return
    setCurrent(api.selectedScrollSnap())
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    api.on('select', onSelect)
    return () => { api.off('select', onSelect) }
  }, [api])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] bg-black/90">
      <Carousel
        setApi={setApi}
        opts={{ startIndex, loop: false }}
        className="h-full w-full"
      >
        <CarouselContent className="ml-0 h-full">
          {photos.map((photo) => (
            <CarouselItem key={photo.id} className="pl-0">
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div
                className="flex h-[100dvh] w-full flex-col items-center justify-center"
                onClick={onClose}
              >
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                <img
                  src={photo.url}
                  alt=""
                  onClick={(e) => e.stopPropagation()}
                  className="max-h-[80vh] max-w-full object-contain"
                />
                {photo.caption && (
                  <p className="mt-4 max-w-md px-4 text-center text-sm text-white font-sans-ui">
                    {photo.caption}
                  </p>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Page indicator */}
      {photos.length > 1 && (
        <span className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white font-sans-ui tabular-nums pointer-events-none">
          {current + 1}/{photos.length}
        </span>
      )}
    </div>
  )
}
