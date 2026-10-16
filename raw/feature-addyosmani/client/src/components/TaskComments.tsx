import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatCommentTime } from '../lib/dates';
import type { Comment } from '../types';
import { Field } from './Field';

export function TaskComments({
  comments,
  currentUserId,
  phase,
  error,
  pending,
  onAdd,
  onDelete,
  onRetry,
}: {
  comments: Comment[];
  currentUserId: string;
  phase: 'loading' | 'ready' | 'error';
  error: string | null;
  pending: boolean;
  onAdd: (body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onRetry: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const message = localError ?? error;
  const busy = pending || phase === 'loading';

  async function add() {
    const body = draft.trim();
    if (!body) {
      setLocalError('Comment is required');
      return;
    }
    setLocalError(null);
    try {
      await onAdd(body);
      setDraft('');
    } catch {
      // The parent records the request error.
    }
  }

  return (
    <section className="grid gap-3 border-t border-border pt-4" aria-labelledby="task-comments-heading">
      <h3 id="task-comments-heading" className="text-sm font-medium">
        Comments
      </h3>
      {phase === 'loading' ? <p className="text-sm text-muted-foreground">Loading comments…</p> : null}
      {phase === 'ready' && comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet</p>
      ) : null}
      {phase === 'ready' && comments.length > 0 ? (
        <ul className="grid gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{comment.author.name}</p>
                <time dateTime={comment.createdAt} className="shrink-0 text-xs text-muted-foreground">
                  {formatCommentTime(comment.createdAt)}
                </time>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
              {comment.author.id === currentUserId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="w-fit px-0 text-muted-foreground hover:text-foreground"
                  disabled={pending}
                  aria-label={`Delete comment by ${comment.author.name}`}
                  onClick={() => void onDelete(comment.id)}
                >
                  Delete
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {message ? (
        <p role="alert" className="text-sm text-rust">
          {message}
        </p>
      ) : null}
      {phase === 'error' ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
      <div className="grid gap-2">
        <Field label="Comment" htmlFor="task-comment">
          <Textarea
            id="task-comment"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            className="min-h-20 bg-card"
            disabled={busy}
          />
        </Field>
        <Button type="button" disabled={busy} className="h-8 w-fit px-3" onClick={() => void add()}>
          {pending ? 'Adding…' : 'Add comment'}
        </Button>
      </div>
    </section>
  );
}
