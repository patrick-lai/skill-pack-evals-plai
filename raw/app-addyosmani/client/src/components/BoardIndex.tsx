import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { BoardSummary, User } from '@bench/shared'
import { createBoard, fieldMessage, listBoards, logout } from '@/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface BoardIndexProps {
  user: User
  onOpen: (boardId: string) => void
  onSignedOut: () => void
}

export function BoardIndex({ user, onOpen, onSignedOut }: BoardIndexProps) {
  const [boards, setBoards] = useState<BoardSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)

  async function load() {
    setError(null)
    try {
      const page = await listBoards()
      setBoards(page.data)
    } catch (caught) {
      setBoards([])
      setError(fieldMessage(caught))
    }
  }

  useEffect(() => {
    let cancel = false
    listBoards()
      .then((page) => { if (!cancel) setBoards(page.data) })
      .catch((caught: unknown) => {
        if (!cancel) {
          setBoards([])
          setError(fieldMessage(caught))
        }
      })
    return () => { cancel = true }
  }, [])

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const created = await createBoard(name.trim())
      setCreating(false)
      setName('')
      onOpen(created.board.id)
    } catch (caught) {
      setError(fieldMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function onLogout() {
    await logout()
    onSignedOut()
  }

  return (
    <div className="min-h-dvh">
      <Header user={user} onLogout={() => void onLogout()} />
      <main id="main" className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-medium">Boards</h1>
            <p className="mt-1 text-sm text-muted-foreground">Each board is a shared wall for one team.</p>
          </div>
          <Button onClick={() => { setCreating(true); setError(null) }}>New board</Button>
        </div>
        {error && !creating ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
        {boards === null ? (
          <div className="mt-8 space-y-3" aria-busy="true" aria-label="Loading boards">
            <div className="h-24 animate-pulse bg-secondary" />
            <div className="h-24 animate-pulse bg-secondary" />
          </div>
        ) : null}
        {boards && boards.length === 0 && !error ? (
          <div className="mt-8 border border-dashed border-border bg-card px-6 py-12 text-center">
            <h2 className="font-display text-2xl">No boards yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Start one for the work your team is sharing.</p>
            <Button className="mt-4" onClick={() => setCreating(true)}>New board</Button>
          </div>
        ) : null}
        {boards && boards.length > 0 ? (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {boards.map((board) => (
              <li key={board.id}>
                <button
                  type="button"
                  onClick={() => onOpen(board.id)}
                  className="w-full border border-border bg-card px-4 py-4 text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block font-display text-2xl">{board.name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {board.memberCount === 1 ? '1 member' : `${board.memberCount} members`} · {board.role === 'owner' ? 'Owner' : 'Member'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {error && boards?.length === 0 ? (
          <Button className="mt-4" variant="outline" onClick={() => void load()}>Try again</Button>
        ) : null}
      </main>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New board</DialogTitle>
            <DialogDescription>Name it after the team or the effort, not after a single task.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate}>
            <Label htmlFor="board-name">Board name</Label>
            <Input id="board-name" className="mt-1" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required autoFocus />
            {error && creating ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create board'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function Header({ user, onLogout, children }: { user: User; onLogout: () => void; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div className="flex items-center gap-4">
        <p className="font-display text-2xl tracking-tight">Bench</p>
        {children}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span>{user.name}</span>
        <Button variant="ghost" size="sm" onClick={onLogout}>Sign out</Button>
      </div>
    </header>
  )
}
