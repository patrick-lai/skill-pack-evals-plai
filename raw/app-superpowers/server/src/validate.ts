import type { TaskStatus } from '@boardline/shared';

const STATUSES: readonly TaskStatus[] = ['todo', 'doing', 'done'];

export function cleanEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > 254) return null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  return email;
}

export function cleanRequiredText(
  value: unknown,
  max: number,
  emptyError: string,
  longError: string,
): string | { error: string } {
  if (typeof value !== 'string' || value.trim().length === 0) return { error: emptyError };
  const text = value.trim();
  if (text.length > max) return { error: longError };
  return text;
}

export function cleanPassword(value: unknown): string | { error: string } {
  if (typeof value !== 'string' || value.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }
  if (value.length > 72) return { error: 'Password must be 72 characters or fewer.' };
  return value;
}

export function cleanDescription(value: unknown): string | { error: string } {
  if (value == null) return '';
  if (typeof value !== 'string') return { error: 'Description must be 4000 characters or fewer.' };
  if (value.length > 4000) return { error: 'Description must be 4000 characters or fewer.' };
  return value;
}

export function cleanStatus(value: unknown): TaskStatus | { error: string } {
  if (value === 'todo' || value === 'doing' || value === 'done') return value;
  if (STATUSES.includes(value as TaskStatus)) return value as TaskStatus;
  return { error: 'Status must be todo, doing, or done.' };
}

export function cleanDueDate(value: unknown): string | null | { error: string } {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !isCalendarDate(value)) {
    return { error: 'Due date must be YYYY-MM-DD.' };
  }
  return value;
}

export function isError(value: object | string | null): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value;
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
