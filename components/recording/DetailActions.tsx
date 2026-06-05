'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MdIcon } from '@/components/ui/MdIcon'
import { buttonVariants } from '@/components/ui/button'
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
import { deleteRecording } from '@/app/actions/recordings'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  DetailActions — overflow menu for the recording detail page        */
/* ------------------------------------------------------------------ */

interface DetailActionsProps {
  recordingId: string
  redirectTo: string
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
  redirectTo,
  editHref,
  labels,
}: DetailActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [alertOpen, setAlertOpen] = useState(false)

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()             // prevent Radix from auto-closing dialog
    startTransition(async () => {
      await deleteRecording(recordingId, redirectTo)
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
