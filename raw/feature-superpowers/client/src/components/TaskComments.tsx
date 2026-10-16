import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { messageFrom } from '../api';
import { formatCommentTime } from '../lib/dates';
import type { Comment } from '../types';
import { Field } from './Field';

export type TaskCommentsProps = {
  status: 'loading' | 'ready' | 'error';
  comments: Comment[];
  error: string | null;
  currentUserId: string;
  onAdd: (body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onRetry: () => void;
};

export function TaskComments({
  status,
  comments,
  error,
  currentUserId,
  onAdd,
  onDelete,
  onRetry,
}: TaskCommentsProps) {
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = body.trim();
    if (!next) {
      setFormError('Comment is required');
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      await onAdd(next);
      setBody('');
    } catch (caught) {
      setFormError(messageFrom(caught, 'Could not add the comment'));
    } finally {
      setPending(false);
    }
  }

  async function remove(commentId: string) {
    setPending(true);
    setFormError(null);
    try {
      await onDelete(commentId);
    } catch (caught) {
      setFormError(messageFrom(caught, 'Could not delete the comment'));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-3 border-t border-border pt-4" aria-label="Comments">
      <h3 className="font-medium">Comments</h3>
      {status === 'loading' ? <p className="text-sm text-muted-foreground">Loading comments…</p> : null}
      {status === 'error' ? (
        <div className="grid gap-2">
          <p role="alert" className="text-sm text-rust">
            {error}
          </p>
          <Button type="button" variant="outline" className="h-8 w-fit px-3" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
      {status === 'ready' && comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : null}
      {status === 'ready' && comments.length > 0 ? (
        <ul className="grid gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg bg-secondary/60 px-3 py-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{comment.author.name}</p>
                <time dateTime={comment.createdAt} className="shrink-0 text-xs text-muted-foreground">
                  {formatCommentTime(comment.createdAt)}
                </time>
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap">{comment.body}</p>
              {comment.author.id === currentUserId ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-1 h-7 px-2 text-muted-foreground"
                  aria-label={`Delete comment from ${comment.author.name}`}
                  disabled={pending}
                  onClick={() => void remove(comment.id)}
                >
                  Delete
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <form className="grid gap-2" onSubmit={(event) => void submit(event)}>
        <Field label="Comment" htmlFor="task-comment">
          <Textarea
            id="task-comment"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            className="min-h-20 bg-card"
            disabled={pending || status === 'loading'}
          />
        </Field>
        {formError ? (
          <p role="alert" className="text-sm text-rust">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={pending || status === 'loading'} className="h-9 w-fit px-4">
          {pending ? 'Adding…' : 'Add comment'}
        </Button>
      </form>
    </section>
  );
}
