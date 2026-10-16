import type { Status } from '@bench/shared'

export function dueLabel(due: string | null, status: Status, today = new Date().toISOString().slice(0, 10)): string {
  if (!due) return 'No date'
  const pretty = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${due}T00:00:00Z`))
  if (status !== 'done' && due < today) return `Overdue ${pretty}`
  return pretty
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?'
}
