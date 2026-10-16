import { useState, type FormEvent } from 'react'
import { fieldMessage, login, registerAccount } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { User } from '@bench/shared'

interface AuthScreenProps {
  onAuthenticated: (user: User) => void
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password: Use at least 8 characters.')
      return
    }
    setPending(true)
    try {
      const result = mode === 'signin'
        ? await login({ email, password })
        : await registerAccount({ email, name, password })
      onAuthenticated(result.user)
    } catch (caught) {
      setError(fieldMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-dvh">
      <a href="#auth-form" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-10 focus:bg-card focus:px-3 focus:py-2">
        Skip to the form
      </a>
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <p className="font-display text-2xl tracking-tight">Bench</p>
        <p className="text-sm text-muted-foreground">A shared wall for the work in motion</p>
      </header>
      <main className="grid min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="border-b border-border px-5 py-10 lg:flex lg:flex-col lg:justify-end lg:border-r lg:border-b-0 lg:px-12 lg:py-16">
          <p className="max-w-xl font-display text-4xl leading-tight sm:text-5xl">
            Three columns. The work moves itself across.
          </p>
          <ol className="mt-8 grid max-w-lg gap-3 text-sm sm:grid-cols-3">
            <li className="border border-border bg-todo px-3 py-3">
              <span className="font-semibold">To do</span>
              <span className="mt-1 block text-muted-foreground">Waiting</span>
            </li>
            <li className="border border-border bg-doing px-3 py-3">
              <span className="font-semibold">Doing</span>
              <span className="mt-1 block text-muted-foreground">In hand</span>
            </li>
            <li className="border border-border bg-done px-3 py-3">
              <span className="font-semibold">Done</span>
              <span className="mt-1 block text-muted-foreground">Finished</span>
            </li>
          </ol>
        </section>
        <section className="flex items-center px-5 py-10 lg:px-12">
          <form id="auth-form" onSubmit={onSubmit} className="w-full max-w-sm" noValidate>
            <div role="tablist" aria-label="Account" className="mb-6 flex gap-4 border-b border-border">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                className={`border-b-2 px-1 pb-2 text-sm font-semibold ${mode === 'signin' ? 'border-foreground' : 'border-transparent text-muted-foreground'}`}
                onClick={() => { setMode('signin'); setError(null) }}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                className={`border-b-2 px-1 pb-2 text-sm font-semibold ${mode === 'register' ? 'border-foreground' : 'border-transparent text-muted-foreground'}`}
                onClick={() => { setMode('register'); setError(null) }}
              >
                Create account
              </button>
            </div>
            <h1 className="font-display text-3xl font-medium">{mode === 'signin' ? 'Welcome back' : 'Open an account'}</h1>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">
              {mode === 'signin' ? 'Use the email and password you registered with.' : 'Your teammates will invite you by this email.'}
            </p>
            {mode === 'register' ? (
              <div className="mb-3">
                <Label htmlFor="name">Name</Label>
                <Input id="name" className="mt-1" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
              </div>
            ) : null}
            <div className="mb-3">
              <Label htmlFor="email">Email</Label>
              <Input id="email" className="mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </div>
            <div className="mb-4">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                className="mt-1"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={8}
                required
              />
            </div>
            {error ? (
              <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>
            ) : null}
            <Button type="submit" className="w-full" size="lg" disabled={pending}>
              {pending ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        </section>
      </main>
    </div>
  )
}
