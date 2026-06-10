interface AuthLayoutProps {
  title: string
  subtitle: string
  children: React.ReactNode
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-8">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground font-sans-ui">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  )
}
