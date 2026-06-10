import { Input } from '@/components/ui/input'

const inputClass =
  'h-8 text-sm rounded-none border-0 border-b border-input focus-visible:ring-0 focus-visible:border-ring'

interface AuthFieldProps {
  id: string
  label: string
  type?: string
  autoComplete: string
}

export function AuthField({ id, label, type = 'text', autoComplete }: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-bold text-muted-foreground font-sans lowercase">{label}</label>
      <Input id={id} name={id} type={type} required autoComplete={autoComplete} className={inputClass} />
    </div>
  )
}
