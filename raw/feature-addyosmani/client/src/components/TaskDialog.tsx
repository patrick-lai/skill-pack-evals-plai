import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api, messageFrom } from '../api';
import { STATUSES, STATUS_META } from '../lib/board';
import type { Comment, Member, Status, Task } from '../types';
import { Field, controlClass } from './Field';
import { TaskComments } from './TaskComments';

export type TaskDraft = {
  title: string;
  description: string;
  status: Status;
  assigneeId: string | null;
  dueDate: string | null;
};

export function TaskDialog({
  open,
  onOpenChange,
  task,
  members,
  currentUserId,
  onSave,
  onDelete,
  onCommentCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  members: Member[];
  currentUserId: string;
  onSave: (draft: TaskDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCommentCount?: (taskId: string, commentCount: number) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>('todo');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsPhase, setCommentsPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentPending, setCommentPending] = useState(false);
  const taskId = task?.id;

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setStatus(task?.status ?? 'todo');
    setAssigneeId(task?.assigneeId ?? '');
    setDueDate(task?.dueDate ?? '');
    setError(null);
    setPending(false);
    setConfirmDelete(false);
    setComments([]);
    setCommentsError(null);
    setCommentPending(false);
  }, [open, taskId, task?.title, task?.description, task?.status, task?.assigneeId, task?.dueDate]);

  const loadComments = useCallback(async () => {
    if (!taskId) return;
    setCommentsPhase('loading');
    setCommentsError(null);
    try {
      const result = await api<{ comments: Comment[] }>(`/api/tasks/${taskId}/comments`);
      setComments(result.comments);
      setCommentsPhase('ready');
      onCommentCount?.(taskId, result.comments.length);
    } catch (caught) {
      setCommentsPhase('error');
      setCommentsError(messageFrom(caught, 'Could not load comments'));
    }
  }, [onCommentCount, taskId]);

  useEffect(() => {
    if (!open || !taskId) return;
    void loadComments();
  }, [loadComments, open, taskId]);

  async function addComment(body: string) {
    if (!taskId) return;
    setCommentPending(true);
    setCommentsError(null);
    try {
      const result = await api<{ comment: Comment }>(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      const next = [...comments, result.comment];
      setComments(next);
      onCommentCount?.(taskId, next.length);
    } catch (caught) {
      setCommentsError(messageFrom(caught, 'Could not add the comment'));
      throw caught;
    } finally {
      setCommentPending(false);
    }
  }

  async function removeComment(commentId: string) {
    if (!taskId) return;
    setCommentPending(true);
    setCommentsError(null);
    try {
      await api(`/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
      const next = comments.filter((comment) => comment.id !== commentId);
      setComments(next);
      onCommentCount?.(taskId, next.length);
    } catch (caught) {
      setCommentsError(messageFrom(caught, 'Could not delete the comment'));
      throw caught;
    } finally {
      setCommentPending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        status,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      });
    } catch (caught) {
      setError(messageFrom(caught, 'Could not save the task'));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!onDelete) return;
    setPending(true);
    setError(null);
    try {
      await onDelete();
    } catch (caught) {
      setError(messageFrom(caught, 'Could not delete the task'));
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <DialogHeader className="pr-8">
            <DialogTitle className="font-serif text-2xl">{task ? 'Edit task' : 'New task'}</DialogTitle>
            <DialogDescription>
              {task ? 'Update the work, who has it, and when it is due.' : 'Add a card to this board.'}
            </DialogDescription>
          </DialogHeader>
          <Field label="Title" htmlFor="task-title">
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              className="h-10 bg-card"
              required
              disabled={pending}
            />
          </Field>
          <Field label="Description" htmlFor="task-description">
            <Textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-28 bg-card"
              disabled={pending}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="task-status">
              <select
                id="task-status"
                className={controlClass}
                value={status}
                disabled={pending}
                onChange={(event) => setStatus(event.target.value as Status)}
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {STATUS_META[item].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due date" htmlFor="task-due">
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="h-10 bg-card"
                disabled={pending}
              />
            </Field>
          </div>
          <Field label="Assignee" htmlFor="task-assignee" hint="Only people on this board can take a task.">
            <select
              id="task-assignee"
              className={controlClass}
              value={assigneeId}
              disabled={pending}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </Field>
          {task ? (
            <TaskComments
              comments={comments}
              currentUserId={currentUserId}
              phase={commentsPhase}
              error={commentsError}
              pending={commentPending}
              onAdd={addComment}
              onDelete={removeComment}
              onRetry={() => void loadComments()}
            />
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-rust">
              {error}
            </p>
          ) : null}
          <DialogFooter className="sm:justify-between">
            {task && onDelete ? (
              confirmDelete ? (
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" disabled={pending} onClick={() => void remove()}>
                    Delete task
                  </Button>
                  <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirmDelete(false)}>
                    Keep
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              )
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending} className="h-9 px-4">
                {pending ? 'Saving…' : 'Save task'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
