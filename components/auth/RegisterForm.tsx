'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AuthField } from '@/components/auth/AuthField'
import { register, login } from '@/app/actions/auth'
import { langPrefix } from '@/lib/utils/i18n'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface RegisterFormProps {
  lang: string
  dict: Dictionary['auth']
}

export function RegisterForm({ lang, dict }: RegisterFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const prefix = langPrefix(lang)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string

    if (password !== confirm) {
      setError(dict.password_mismatch)
      return
    }

    startTransition(async () => {
      const result = await register(formData)
      if (result.error) {
        setError(dict[result.error as keyof typeof dict] ?? dict.register_error)
        return
      }
      const loginResult = await login(formData)
      if (loginResult.error) {
        router.push(`${prefix}/login`)
      } else {
        router.push(prefix || '/')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 font-sans-ui">
      <AuthField id="username" label={dict.username} autoComplete="username" />
      <AuthField id="password" label={dict.password} type="password" autoComplete="new-password" />
      <AuthField id="confirm" label={dict.confirm_password} type="password" autoComplete="new-password" />
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
          {isPending ? dict.register_pending : dict.register}
        </PopoverTrigger>
        <PopoverContent side="top" sideOffset={8} align="end" className="font-sans-ui shadow-none ring-0 bg-neutral-100 w-auto max-w-[var(--anchor-width)]">
          <p className="text-sm text-destructive">{error}</p>
        </PopoverContent>
      </Popover>
      <p className="text-center text-sm text-muted-foreground">
        {dict.have_account}{' '}
        <Link href={`${prefix}/login`} className="underline underline-offset-2 hover:text-foreground">
          {dict.login}
        </Link>
      </p>
    </form>
  )
}
