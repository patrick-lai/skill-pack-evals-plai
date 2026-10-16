import { useEffect, useState } from 'react'
import { planMove, type BoardDetail, type Status, type Task, type User } from '@bench/shared'
import {
  deleteBoard,
  deleteTask,
  fieldMessage,
  getBoard,
  inviteMember,
  listTasks,
  createTask,
  removeMember,
  renameBoard,
  updateTask,
  type TaskInput,
} from '@/api'
import { BoardColumns } from '@/components/BoardColumns'
import { Header } from '@/components/BoardIndex'
import { TaskDialog, type TaskDraft } from '@/components/TaskDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { initials } from '@/lib/format'

interface BoardViewProps {
  user: User
  boardId: string
  onBack: () => void
  onSignedOut: () => void
}

export function BoardView({ user, boardId, onBack, onSignedOut }: BoardViewProps) {
  const [board, setBoard] = useState<BoardDetail | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<TaskDraft | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function refresh() {
    const [boardResult, taskResult] = await Promise.all([getBoard(boardId), listTasks(boardId)])
    setBoard(boardResult.board)
    setTasks(taskResult.data)
    setTruncated(taskResult.pagination.totalItems > taskResult.data.length)
  }

  useEffect(() => {
    let cancel = false
    setLoading(true)
    setError(null)
    Promise.all([getBoard(boardId), listTasks(boardId)])
      .then(([boardResult, taskResult]) => {
        if (cancel) return
        setBoard(boardResult.board)
        setTasks(taskResult.data)
        setTruncated(taskResult.pagination.totalItems > taskResult.data.length)
      })
      .catch((caught: unknown) => {
        if (!cancel) setError(fieldMessage(caught))
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => { cancel = true }
  }, [boardId])

  async function onMove(taskId: string, status: Status, index: number) {
    const previous = tasks
    setTasks(planMove(tasks, taskId, status, index))
    setError(null)
    try {
      await updateTask(boardId, taskId, { status, position: index })
      const page = await listTasks(boardId)
      setTasks(page.data)
    } catch (caught) {
      setTasks(previous)
      setError(fieldMessage(caught))
    }
  }

  async function onSave(input: TaskInput) {
    if (!draft) return
    setPending(true)
    setDialogError(null)
    try {
      if (draft.mode === 'create') {
        await createTask(boardId, input)
      } else {
        const patch: Partial<TaskInput> = {
          title: input.title,
          description: input.description,
          assigneeId: input.assigneeId,
          dueDate: input.dueDate,
        }
        if (input.status !== draft.task.status) patch.status = input.status
        await updateTask(boardId, draft.task.id, patch)
      }
      await refresh()
      setDraft(null)
    } catch (caught) {
      setDialogError(fieldMessage(caught))
    } finally {
      setPending(false)
    }
  }

  async function onDeleteTask() {
    if (draft?.mode !== 'edit') return
    setPending(true)
    try {
      await deleteTask(boardId, draft.task.id)
      await refresh()
      setDraft(null)
    } catch (caught) {
      setDialogError(fieldMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-dvh">
      <Header user={user} onLogout={onSignedOut}>
        <Button variant="ghost" size="sm" onClick={onBack}>All boards</Button>
      </Header>
      <main id="main" className="mx-auto max-w-6xl px-5 py-6">
        {loading ? (
          <div aria-busy="true" aria-label="Loading board" className="grid gap-4 lg:grid-cols-3">
            <div className="h-64 animate-pulse bg-secondary" />
            <div className="h-64 animate-pulse bg-secondary" />
            <div className="h-64 animate-pulse bg-secondary" />
          </div>
        ) : null}
        {!loading && error && !board ? (
          <div className="border border-border bg-card px-6 py-10">
            <h1 className="font-display text-3xl">This board is not available</h1>
            <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>
            <Button className="mt-4" variant="outline" onClick={onBack}>Back to boards</Button>
          </div>
        ) : null}
        {board ? (
          <>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-display text-4xl font-medium">{board.name}</h1>
                <ul className="mt-2 flex flex-wrap gap-2" aria-label="Members">
                  {board.members.map((member) => (
                    <li key={member.id} className="border border-border bg-card px-2 py-1 text-xs">
                      <span className="mr-1 font-semibold">{initials(member.name)}</span>
                      {member.name}
                      <span className="text-muted-foreground"> · {member.role === 'owner' ? 'Owner' : 'Member'}</span>
                      {board.role === 'owner' && member.role !== 'owner' ? (
                        <button type="button" className="ml-2 underline" onClick={() => void removeMember(boardId, member.id).then(refresh).catch((caught: unknown) => setError(fieldMessage(caught)))}>
                          Remove
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                {board.role === 'owner' ? <Button variant="outline" onClick={() => setInviteOpen(true)}>Invite</Button> : null}
                {board.role === 'owner' ? <Button variant="outline" onClick={() => setRenameOpen(true)}>Rename</Button> : null}
                {board.role === 'owner' ? <Button variant="ghost" onClick={() => setDeleteOpen(true)}>Delete board</Button> : null}
              </div>
            </div>
            {error ? <p role="alert" className="mb-3 text-sm text-destructive">{error}</p> : null}
            <BoardColumns
              tasks={tasks}
              members={board.members}
              truncated={truncated}
              onMove={(taskId, status, index) => void onMove(taskId, status, index)}
              onOpen={(task) => { setDialogError(null); setDraft({ mode: 'edit', task }) }}
              onCreate={(status) => { setDialogError(null); setDraft({ mode: 'create', status }) }}
            />
          </>
        ) : null}
      </main>
      <TaskDialog
        draft={draft}
        members={board?.members ?? []}
        pending={pending}
        error={dialogError}
        onClose={() => setDraft(null)}
        onSave={onSave}
        onDelete={draft?.mode === 'edit' ? onDeleteTask : undefined}
      />
      <NameDialog
        open={inviteOpen}
        title="Invite a teammate"
        description="They need an account already. Bench matches the email exactly."
        label="Email"
        type="email"
        submitLabel="Invite"
        onClose={() => setInviteOpen(false)}
        onSubmit={async (value) => {
          await inviteMember(boardId, value)
          await refresh()
        }}
      />
      <NameDialog
        open={renameOpen}
        title="Rename board"
        description="The new name shows up for every member."
        label="Board name"
        submitLabel="Save name"
        initial={board?.name ?? ''}
        onClose={() => setRenameOpen(false)}
        onSubmit={async (value) => {
          await renameBoard(boardId, value)
          await refresh()
        }}
      />
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this board?</DialogTitle>
            <DialogDescription>Tasks on {board?.name} are removed for every member.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Keep it</Button>
            <Button
              variant="destructive"
              onClick={() => {
                void deleteBoard(boardId).then(onBack).catch((caught: unknown) => setError(fieldMessage(caught)))
              }}
            >
              Delete board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NameDialog({
  open,
  title,
  description,
  label,
  type = 'text',
  submitLabel,
  initial = '',
  onClose,
  onSubmit,
}: {
  open: boolean
  title: string
  description: string
  label: string
  type?: string
  submitLabel: string
  initial?: string
  onClose: () => void
  onSubmit: (value: string) => Promise<void>
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (open) {
      setValue(initial)
      setError(null)
    }
  }, [open, initial])

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setPending(true)
            setError(null)
            void onSubmit(value.trim())
              .then(onClose)
              .catch((caught: unknown) => setError(fieldMessage(caught)))
              .finally(() => setPending(false))
          }}
        >
          <Label htmlFor="name-dialog">{label}</Label>
          <Input id="name-dialog" className="mt-1" type={type} value={value} onChange={(event) => setValue(event.target.value)} required />
          {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
