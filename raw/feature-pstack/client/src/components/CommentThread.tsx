import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, api, messageFrom } from '../api';
import { formatCommentTime } from '../lib/dates';
import { initials } from '../lib/text';
import type { Comment } from '../types';
import { Field } from './Field';

type ThreadState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; comments: Comment[] };

export function CommentThread({
  taskId,
  currentUserId,
  onCount,
}: {
  taskId: string;
  currentUserId: string;
  onCount: (taskId: string, commentCount: number) => void;
}) {
  const [thread, setThread] = useState<ThreadState>({ phase: 'loading' });
  const [draft, setDraft] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  const loadComments = useCallback(() => {
    const id = ++requestId.current;
    void api<{ comments: Comment[] }>(`/api/tasks/${taskId}/comments`)
      .then((result) => {
        if (id !== requestId.current) return;
        setThread({ phase: 'ready', comments: result.comments });
      })
      .catch((error: unknown) => {
        if (id !== requestId.current) return;
        setThread({ phase: 'error', message: messageFrom(error, 'Could not load comments') });
      });
  }, [taskId]);

  useEffect(() => {
    loadComments();
    return () => {
      requestId.current += 1;
    };
  }, [loadComments]);

  useEffect(() => {
    if (thread.phase !== 'ready') return;
    onCount(taskId, thread.comments.length);
  }, [thread, taskId, onCount]);

  function drop(commentId: string) {
    setThread((current) => {
      if (current.phase !== 'ready') return current;
      return {
        phase: 'ready',
        comments: current.comments.filter((comment) => comment.id !== commentId),
      };
    });
  }

  async function add() {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setActionError(null);
    try {
      const result = await api<{ comment: Comment }>(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      setThread((current) => {
        if (current.phase !== 'ready') return current;
        return { phase: 'ready', comments: [...current.comments, result.comment] };
      });
      setDraft('');
    } catch (error) {
      setActionError(messageFrom(error, 'Could not add that comment'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(commentId: string) {
    setBusy(true);
    setActionError(null);
    try {
      await api(`/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
      drop(commentId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        drop(commentId);
        return;
      }
      setActionError(messageFrom(error, 'Could not delete that comment'));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void add();
  }

  let body: ReactNode;
  switch (thread.phase) {
    case 'loading':
      body = <p className="text-sm text-muted-foreground">Loading comments…</p>;
      break;
    case 'error':
      body = (
        <div className="grid justify-items-start gap-2">
          <p role="alert" className="text-sm text-rust">
            {thread.message}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setActionError(null);
              setThread({ phase: 'loading' });
              loadComments();
            }}
          >
            Retry
          </Button>
        </div>
      );
      break;
    case 'ready':
      body = (
        <>
          <ul className="grid max-h-48 gap-2 overflow-y-auto">
            {thread.comments.length === 0 ? (
              <li className="text-sm text-muted-foreground">No comments yet.</li>
            ) : (
              thread.comments.map((comment) => (
                <li key={comment.id} className="rounded-xl border border-border bg-card px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                        {initials(comment.author.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{comment.author.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {comment.author.email}
                        </span>
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
                        {formatCommentTime(comment.createdAt)}
                      </time>
                      {comment.author.id === currentUserId ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void remove(comment.id)}
                        >
                          Delete comment
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-sm break-words whitespace-pre-wrap">{comment.body}</p>
                </li>
              ))
            )}
          </ul>
          <form className="grid gap-2" onSubmit={submit}>
            <Field label="Comment" htmlFor="task-comment">
              <Textarea
                id="task-comment"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={2000}
                className="bg-card"
                disabled={busy}
              />
            </Field>
            {actionError ? (
              <p role="alert" className="text-sm text-rust">
                {actionError}
              </p>
            ) : null}
            <Button type="button" disabled={busy} className="h-9 w-fit" onClick={() => void add()}>
              Add comment
            </Button>
          </form>
        </>
      );
      break;
    default: {
      const _exhaustive: never = thread;
      return _exhaustive;
    }
  }

  return (
    <section className="grid gap-3">
      <h2 className="font-medium">Comments</h2>
      {body}
    </section>
  );
}
