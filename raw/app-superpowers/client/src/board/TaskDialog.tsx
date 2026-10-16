import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Member, Task, TaskStatus } from '@boardline/shared';

export type TaskDraft = {
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  dueDate: string | null;
};

export function TaskDialog({
  task,
  members,
  pending,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task | null;
  members: Member[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (draft: TaskDraft) => void;
  onDelete?: () => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const assignee = String(data.get('assigneeId') ?? '');
    const due = String(data.get('dueDate') ?? '');
    onSave({
      title: String(data.get('title') ?? ''),
      description: String(data.get('description') ?? ''),
      status: String(data.get('status') ?? 'todo') as TaskStatus,
      assigneeId: assignee || null,
      dueDate: due || null,
    });
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="task-dialog-title">{task ? 'Edit task' : 'Add task'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input ref={titleRef} name="title" defaultValue={task?.title ?? ''} required />
          </label>
          <label>
            Description
            <textarea name="description" rows={4} defaultValue={task?.description ?? ''} />
          </label>
          <div className="dialog-grid">
            <label>
              Status
              <select name="status" defaultValue={task?.status ?? 'todo'}>
                <option value="todo">Todo</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label>
              Assignee
              <select name="assigneeId" defaultValue={task?.assigneeId ?? ''}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input name="dueDate" type="date" defaultValue={task?.dueDate ?? ''} />
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button className="button primary" type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </button>
            <button className="button" type="button" onClick={onClose}>
              Close
            </button>
            {onDelete && !confirming ? (
              <button className="button danger" type="button" onClick={() => setConfirming(true)}>
                Delete task
              </button>
            ) : null}
          </div>
          {confirming && (
            <div className="confirm">
              <p>Delete this task?</p>
              <button className="button danger" type="button" onClick={onDelete} disabled={pending}>
                Delete
              </button>
              <button className="button" type="button" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
