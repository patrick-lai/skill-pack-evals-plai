import { describe, expect, it } from 'vitest';
import { formatCommentTime, formatDue, formatUpdated } from './dates';

describe('dates', () => {
  it('labels overdue, today, and upcoming due dates', () => {
    expect(formatDue('2026-10-12', '2026-10-15')).toEqual({
      label: 'Overdue Oct 12',
      tone: 'overdue',
    });
    expect(formatDue('2026-10-15', '2026-10-15').tone).toBe('today');
    expect(formatDue('2026-10-20', '2026-10-15')).toMatchObject({ tone: 'upcoming' });
  });

  it('describes a recent update', () => {
    const now = new Date('2026-10-15T12:00:00.000Z');
    expect(formatUpdated('2026-10-15T11:58:30.000Z', now)).toBe('Updated 2m ago');
  });

  it('formats a comment time from a fixed clock', () => {
    const now = new Date('2026-10-15T12:00:00.000Z');
    expect(formatCommentTime('2026-10-15T11:59:40.000Z', now)).toBe('Just now');
    expect(formatCommentTime('2026-10-15T11:58:00.000Z', now)).toBe('2m ago');
    expect(formatCommentTime('2026-10-15T09:00:00.000Z', now)).toBe('3h ago');
    expect(formatCommentTime('2026-10-12T00:30:00.000Z', now)).toBe('Oct 12');
    expect(formatCommentTime('not-a-time', now)).toBe('Unknown time');
  });
});
