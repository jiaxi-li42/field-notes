'use client'

import { useRouter } from 'next/navigation'

export function BackButton({ label, className }: { label: string; className?: string }) {
  const router = useRouter()
  return (
    <button type="button" onClick={() => router.back()} className={className}>
      {label}
    </button>
  )
}
