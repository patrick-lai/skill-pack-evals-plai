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

  it('formats a comment time in UTC', () => {
    expect(formatCommentTime('2026-10-15T23:38:00.000Z')).toBe('Oct 15, 2026, 11:38 PM');
    expect(formatCommentTime('2026-10-15T00:05:00.000Z')).toBe('Oct 15, 2026, 12:05 AM');
    expect(formatCommentTime('not-a-time')).toBe('Unknown time');
  });

  it('describes a recent update', () => {
    const now = new Date('2026-10-15T12:00:00.000Z');
    expect(formatUpdated('2026-10-15T11:58:30.000Z', now)).toBe('Updated 2m ago');
  });
});
