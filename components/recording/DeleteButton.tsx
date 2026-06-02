'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MdIcon } from '@/components/ui/MdIcon'
import { deleteRecording } from '@/app/actions/recordings'

interface DeleteButtonProps {
  recordingId: string
  label: string
  confirmMessage: string
  redirectTo: string
}

export function DeleteButton({ recordingId, label, confirmMessage, redirectTo }: DeleteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(confirmMessage)) return
    startTransition(async () => {
      await deleteRecording(recordingId)
      router.push(redirectTo)
      router.refresh()
    })
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      className="gap-1"
      onClick={handleDelete}
      disabled={isPending}
    >
      <MdIcon name="delete" size={16} />
      {isPending ? '…' : label}
    </Button>
  )
}
