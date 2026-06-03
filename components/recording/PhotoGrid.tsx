interface PhotoItem {
  id: string
  url: string
  caption: string
  width: number
  height: number
}

interface PhotoGridProps {
  photos: PhotoItem[]
}

const ROTATIONS = [-0.8, 0.6, -0.5, 1.0, -0.3, 0.7, -0.9, 0.4, -0.6, 0.8]

export function PhotoGrid({ photos }: PhotoGridProps) {
  if (photos.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {photos.map((photo, i) => {
        const ratio = photo.width && photo.height ? photo.width / photo.height : 1
        const landscape = ratio > 1.1
        const square = !landscape && ratio >= 0.9
        const rotate = ROTATIONS[i % ROTATIONS.length]
        return (
          <figure
            key={photo.id}
            className={landscape ? 'md:col-span-2' : ''}
            style={{ transform: `rotate(${rotate}deg)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption}
              className={`w-full object-cover ${landscape ? 'aspect-[4/3]' : square ? 'aspect-square' : 'aspect-[3/4]'}`}
            />
            {photo.caption && (
              <figcaption className="mt-1 text-sm text-muted-foreground font-sans-ui">
                {photo.caption}
              </figcaption>
            )}
          </figure>
        )
      })}
    </div>
  )
}
