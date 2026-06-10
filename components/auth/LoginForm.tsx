'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AuthField } from '@/components/auth/AuthField'
import { login } from '@/app/actions/auth'
import { langPrefix } from '@/lib/utils/i18n'

interface LoginFormProps {
  lang: string
  dict: {
    login: string
    username: string
    password: string
    login_error: string
    rate_limited: string
    login_pending: string
    no_account: string
    register: string
  }
}

export function LoginForm({ lang, dict }: LoginFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const prefix = langPrefix(lang)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await login(formData)
      if (result.error) {
        setError(result.error === 'rate_limited' ? dict.rate_limited : dict.login_error)
      } else {
        router.push(prefix || '/')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 font-sans-ui">
      <AuthField id="username" label={dict.username} autoComplete="username" />
      <AuthField id="password" label={dict.password} type="password" autoComplete="current-password" />
      <Popover open={!!error} onOpenChange={(open) => { if (!open) setError(null) }}>
        <PopoverTrigger
          render={
            <Button
              type="submit"
              className="w-full bg-neutral-100 font-sans lowercase text-foreground hover:bg-neutral-200"
              disabled={isPending}
            />
          }
        >
          {isPending ? dict.login_pending : dict.login}
        </PopoverTrigger>
        <PopoverContent side="top" sideOffset={8} align="end" className="font-sans-ui shadow-none ring-0 bg-neutral-100 w-auto max-w-[var(--anchor-width)]">
          <p className="text-sm text-destructive">{error}</p>
        </PopoverContent>
      </Popover>
      <p className="text-center text-sm text-muted-foreground">
        {dict.no_account}{' '}
        <Link href={`${prefix}/register`} className="underline underline-offset-2 hover:text-foreground">
          {dict.register}
        </Link>
      </p>
    </form>
  )
}
