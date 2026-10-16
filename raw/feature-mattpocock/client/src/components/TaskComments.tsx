import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { messageFrom } from '../api';
import { formatCommentTime } from '../lib/dates';
import type { Comment } from '../types';
import { Field } from './Field';

export function TaskComments({
  comments,
  currentUserId,
  onAdd,
  onDelete,
  loadState = 'ready',
}: {
  comments: Comment[];
  currentUserId: string;
  onAdd: (body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  loadState?: 'loading' | 'ready' | 'error';
}) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = body.trim();
    if (!next) {
      setError('Comment is required');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onAdd(next);
      setBody('');
    } catch (caught) {
      setError(messageFrom(caught, 'Could not add the comment'));
    } finally {
      setPending(false);
    }
  }

  async function remove(commentId: string) {
    setPending(true);
    setError(null);
    try {
      await onDelete(commentId);
    } catch (caught) {
      setError(messageFrom(caught, 'Could not delete the comment'));
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-label="Comments" className="grid gap-3">
      <h3 className="font-medium">Comments</h3>
      {loadState === 'loading' ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : loadState === 'error' ? (
        <p role="alert" className="text-sm text-rust">
          Could not load comments.
        </p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ol className="grid max-h-36 gap-2 overflow-y-auto">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-border bg-card px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm">
                  <span className="font-medium">{comment.author.name}</span>
                  <time dateTime={comment.createdAt} className="ml-2 text-muted-foreground">
                    {formatCommentTime(comment.createdAt)}
                  </time>
                </p>
                {comment.author.id === currentUserId ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs text-muted-foreground hover:text-rust"
                    aria-label={`Delete your comment: ${comment.body}`}
                    disabled={pending}
                    onClick={() => void remove(comment.id)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap">{comment.body}</p>
            </li>
          ))}
        </ol>
      )}
      <form className="grid gap-2" onSubmit={(event) => void submit(event)}>
        <Field label="Comment" htmlFor="task-comment">
          <Textarea
            id="task-comment"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            className="min-h-16 bg-card"
            disabled={pending}
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-rust">
            {error}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={pending} className="h-9 px-4">
            {pending ? 'Saving…' : 'Add comment'}
          </Button>
        </div>
      </form>
    </section>
  );
}
