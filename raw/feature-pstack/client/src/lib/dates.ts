export type DueTone = 'overdue' | 'today' | 'upcoming';

export function todayISO(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDue(dueDate: string, today = todayISO()): { label: string; tone: DueTone } {
  const [year, month, day] = dueDate.split('-').map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (dueDate < today) return { label: `Overdue ${label}`, tone: 'overdue' };
  if (dueDate === today) return { label: 'Due today', tone: 'today' };
  return { label: `Due ${label}`, tone: 'upcoming' };
}

export function formatUpdated(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Updated';
  const minutes = Math.round((now.getTime() - then) / 60000);
  if (minutes < 1) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `Updated ${days}d ago`;
  return `Updated ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function formatCommentTime(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Unknown time';
  const elapsed = now.getTime() - then;
  if (elapsed < 60_000) return 'Just now';
  if (elapsed < 3_600_000) return `${Math.round(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.round(elapsed / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
