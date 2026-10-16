import { useEffect, useState } from 'react';
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
import { messageFrom } from '../api';
import { Field } from './Field';

export function BoardDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'rename';
  initial?: { name: string; description: string };
  onSave: (input: { name: string; description: string }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setError(null);
    setPending(false);
  }, [open, initial]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Board name is required');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), description: description.trim() });
    } catch (caught) {
      setError(messageFrom(caught, 'Could not save the board'));
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          <DialogHeader className="pr-8">
            <DialogTitle className="font-serif text-2xl">
              {mode === 'create' ? 'New board' : 'Rename board'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Give this stream of work a name the team will recognize.'
                : 'Change the name or the note under it.'}
            </DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="board-name">
            <Input
              id="board-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              className="h-10 bg-card"
              required
              disabled={pending}
            />
          </Field>
          <Field label="Description" htmlFor="board-description">
            <Textarea
              id="board-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              className="min-h-24 bg-card"
              disabled={pending}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-rust">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="h-9 px-4">
              {pending ? 'Saving…' : mode === 'create' ? 'Create board' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
