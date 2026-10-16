import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { STATUSES, STATUS_META, columnId, groupTasks, statusForTarget } from '../lib/board';
import type { Status, Task } from '../types';
import { TaskCard, TaskCardView } from './TaskCard';

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length > 0) {
    const card = hits.find((hit) => !String(hit.id).startsWith('column:'));
    if (card) return [card];
    return hits;
  }
  return closestCenter(args);
};

function Column({
  status,
  index,
  tasks,
  highlighted,
  onOpen,
}: {
  status: Status;
  index: number;
  tasks: Task[];
  highlighted: boolean;
  onOpen: (task: Task) => void;
}) {
  const meta = STATUS_META[status];
  const { setNodeRef } = useDroppable({ id: columnId(status) });
  const dot =
    status === 'todo' ? 'bg-foreground/50' : status === 'doing' ? 'bg-amber' : 'bg-moss';

  return (
    <section
      data-testid={`column-${status}`}
      aria-label={`${meta.label}, ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}
      className="flex min-h-[280px] flex-col rounded-2xl bg-lane p-3 ring-1 ring-border/80"
    >
      <header className="flex items-baseline justify-between gap-3 px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', dot)} aria-hidden="true" />
          <h2 className="font-serif text-xl tracking-tight">{meta.label}</h2>
          <span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
        </div>
        <span className="text-sm text-muted-foreground">{tasks.length}</span>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex flex-1 flex-col gap-3 rounded-xl p-1 transition-colors',
            highlighted && 'bg-tide/10',
          )}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpen} />
          ))}
          {tasks.length === 0 ? (
            <p className="grid flex-1 place-items-center px-3 py-8 text-center text-sm text-muted-foreground">
              {highlighted ? 'Drop a task here' : 'Nothing docked'}
            </p>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

export function BoardColumns({
  tasks,
  onMove,
  onOpen,
}: {
  tasks: Task[];
  onMove: (activeId: string, overId: string) => void;
  onOpen: (task: Task) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const grouped = groupTasks(tasks);
  const active = tasks.find((task) => task.id === activeId) ?? null;
  const highlighted = statusForTarget(tasks, overId);

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setOverId(null);
    if (!event.over) return;
    onMove(String(event.active.id), String(event.over.id));
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={(event) => setOverId(event.over ? String(event.over.id) : null)}
      onDragCancel={() => {
        setActiveId(null);
        setOverId(null);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {STATUSES.map((status, index) => (
          <Column
            key={status}
            status={status}
            index={index}
            tasks={grouped[status]}
            highlighted={highlighted === status && activeId !== null}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>{active ? <TaskCardView task={active} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
