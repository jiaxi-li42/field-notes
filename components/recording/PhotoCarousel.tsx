'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'

interface PhotoCarouselProps {
  photos: { id: string; url: string; caption: string }[]
}

export function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  const onSelect = useCallback(() => {
    if (!api) return
    setCurrent(api.selectedScrollSnap())
  }, [api])

  useEffect(() => {
    if (!api) return
    onSelect()
    api.on('select', onSelect)
    return () => { api.off('select', onSelect) }
  }, [api, onSelect])

  const count = photos.length

  return (
    <div className="relative w-full md:max-h-[70vh] overflow-hidden bg-neutral-200">
      <Carousel setApi={setApi} opts={{ loop: count > 1, align: 'start' }}>
        <CarouselContent>
          {photos.map((photo) => (
            <CarouselItem key={photo.id} className="md:basis-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption}
                className="aspect-[3/4] w-full md:w-auto md:max-h-[70vh] object-cover"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Progress bar */}
      {count > 1 && (
        <div className="absolute bottom-0 left-0 right-0 flex h-1">
          {photos.map((_, i) => (
            <div
              key={i}
              className="h-full flex-1 transition-colors duration-200"
              style={{ backgroundColor: i === current ? 'var(--foreground)' : 'transparent' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
