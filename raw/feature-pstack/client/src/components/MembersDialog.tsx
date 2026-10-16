import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { messageFrom } from '../api';
import { initials } from '../lib/text';
import type { Member } from '../types';
import { Field } from './Field';

export function MembersDialog({
  open,
  onOpenChange,
  members,
  currentUserId,
  isOwner,
  onInvite,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  currentUserId: string;
  isOwner: boolean;
  onInvite: (email: string) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setError('Enter an email');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onInvite(email.trim());
      setEmail('');
    } catch (caught) {
      setError(messageFrom(caught, 'Could not add that person'));
    } finally {
      setPending(false);
    }
  }

  async function remove(userId: string) {
    setPending(true);
    setError(null);
    try {
      await onRemove(userId);
      setConfirmId(null);
    } catch (caught) {
      setError(messageFrom(caught, 'Could not update members'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setError(null);
          setConfirmId(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle className="font-serif text-2xl">People</DialogTitle>
          <DialogDescription>
            Invite someone who already has a Quay account. They can then be assigned tasks.
          </DialogDescription>
        </DialogHeader>
        <ul className="grid gap-2">
          {members.map((member) => {
            const leaving = member.id === currentUserId && member.role !== 'owner';
            const removable = isOwner && member.role !== 'owner';
            return (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                    {initials(member.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{member.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{member.email}</span>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {member.role === 'owner' ? 'Owner' : 'Member'}
                  </span>
                  {leaving || removable ? (
                    confirmId === member.id ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => void remove(member.id)}
                      >
                        {leaving ? 'Leave' : 'Remove'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => setConfirmId(member.id)}
                      >
                        {leaving ? 'Leave' : 'Remove'}
                      </Button>
                    )
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <form className="grid gap-3" onSubmit={(event) => void invite(event)}>
          <Field label="Invite by email" htmlFor="invite-email" hint="They need to register before you can add them.">
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
              className="h-10 bg-card"
              disabled={pending}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-rust">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="h-9">
            {pending ? 'Saving…' : 'Add to board'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
