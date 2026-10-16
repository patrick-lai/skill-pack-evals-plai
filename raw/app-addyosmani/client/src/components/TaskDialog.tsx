import { useEffect, useState, type FormEvent } from 'react'
import type { Member, Status, Task } from '@bench/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { TaskInput } from '@/api'

export type TaskDraft =
  | { mode: 'create'; status: Status }
  | { mode: 'edit'; task: Task }

interface TaskDialogProps {
  draft: TaskDraft | null
  members: Member[]
  pending: boolean
  error: string | null
  onClose: () => void
  onSave: (input: TaskInput) => Promise<void>
  onDelete?: () => Promise<void>
}

export function TaskDialog({ draft, members, pending, error, onClose, onSave, onDelete }: TaskDialogProps) {
  const task = draft?.mode === 'edit' ? draft.task : null
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>('todo')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setStatus(task?.status ?? (draft?.mode === 'create' ? draft.status : 'todo'))
    setAssigneeId(task?.assigneeId ?? '')
    setDueDate(task?.dueDate ?? '')
    setConfirmDelete(false)
  }, [draft, task])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await onSave({
      title: title.trim(),
      description,
      status,
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
    })
  }

  return (
    <Dialog open={draft !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>Title is required. Assignee and due date can wait.</DialogDescription>
        </DialogHeader>
        {confirmDelete ? (
          <div>
            <p className="text-sm">Delete “{task?.title}”? This cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Keep it</Button>
              <Button variant="destructive" disabled={pending} onClick={() => void onDelete?.()}>Delete task</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" className="mt-1" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} required />
            </div>
            <div className="mb-3">
              <Label htmlFor="task-description">Description</Label>
              <Textarea id="task-description" className="mt-1" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} />
            </div>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="task-status">Status</Label>
                <select id="task-status" className="mt-1 h-10 w-full border border-input bg-card px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as Status)}>
                  <option value="todo">To do</option>
                  <option value="doing">Doing</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <Label htmlFor="task-due">Due date</Label>
                <Input id="task-due" className="mt-1" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
            </div>
            <div className="mb-3">
              <Label htmlFor="task-assignee">Assignee</Label>
              <select id="task-assignee" className="mt-1 h-10 w-full border border-input bg-card px-3 text-sm" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
            {error ? <p role="alert" className="mb-3 text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              {task && onDelete ? (
                <Button variant="ghost" className="mr-auto text-destructive" onClick={() => setConfirmDelete(true)}>Delete</Button>
              ) : null}
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save task'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
