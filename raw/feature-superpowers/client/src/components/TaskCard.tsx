import { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MessageSquare, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDue } from '../lib/dates';
import { initials } from '../lib/text';
import type { Task } from '../types';

export function TaskCardView({ task, overlay = false }: { task: Task; overlay?: boolean }) {
  const due = task.dueDate ? formatDue(task.dueDate) : null;
  const tone = task.status === 'done' && due ? 'done' : due?.tone;

  return (
    <article
      data-testid={`task-${task.id}`}
      className={cn(
        'rounded-xl border border-border bg-card px-3 py-3 shadow-[0_1px_0_rgba(28,25,21,0.04)]',
        overlay && 'shadow-xl ring-1 ring-tide/30',
      )}
    >
      <div className="flex items-start gap-2 pr-8">
        <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h3 className="font-medium leading-snug">{task.title}</h3>
      </div>
      {task.description ? (
        <p className="mt-2 line-clamp-2 pl-6 text-sm text-muted-foreground">{task.description}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2 pl-6">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="grid size-5 place-items-center rounded-full bg-secondary text-[10px] font-semibold text-foreground">
            {task.assignee ? initials(task.assignee.name) : '–'}
          </span>
          {task.assignee ? task.assignee.name : 'Unassigned'}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="size-3.5" aria-hidden="true" />
          {task.commentCount === 1 ? '1 comment' : `${task.commentCount} comments`}
        </span>
        {due ? (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs',
              tone === 'overdue' && 'bg-rust/10 text-rust',
              tone === 'today' && 'bg-amber/10 text-amber',
              tone === 'upcoming' && 'bg-secondary text-muted-foreground',
              tone === 'done' && 'bg-secondary text-muted-foreground line-through',
            )}
          >
            {due.label}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function TaskCard({ task, onOpen }: { task: Task; onOpen: (task: Task) => void }) {
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative', isDragging && 'opacity-40')}
    >
      <div
        className="cursor-grab rounded-xl active:cursor-grabbing"
        {...attributes}
        {...listeners}
        onPointerDown={(event) => {
          pointer.current = { x: event.clientX, y: event.clientY };
          listeners?.onPointerDown?.(event);
        }}
        onClick={(event) => {
          if (!pointer.current) return;
          const moved =
            Math.abs(event.clientX - pointer.current.x) > 6 ||
            Math.abs(event.clientY - pointer.current.y) > 6;
          if (!moved) onOpen(task);
        }}
      >
        <TaskCardView task={task} />
      </div>
      <button
        type="button"
        className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label={`Edit ${task.title}`}
        onClick={() => onOpen(task)}
      >
        <Pencil className="size-3.5" />
      </button>
    </div>
  );
}
