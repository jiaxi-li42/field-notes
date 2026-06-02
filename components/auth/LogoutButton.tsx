'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function LogoutButton({ label }: { label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="px-2"
      onClick={() => signOut({ callbackUrl: '/login' })}
    >
      {label}
    </Button>
  )
}
