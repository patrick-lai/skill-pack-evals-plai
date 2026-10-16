import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import {
  api,
  messageOf,
  type BoardDetail,
  type BoardSummary,
  type Member,
  type Status,
  type Task,
  type TaskInput,
} from './api';

const COLUMNS: { status: Status; label: string }[] = [
  { status: 'todo', label: 'To do' },
  { status: 'doing', label: 'Doing' },
  { status: 'done', label: 'Done' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDue(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return `${MONTHS[(month ?? 1) - 1]} ${day}, ${year}`;
}

function isOverdue(iso: string, status: Status, today = new Date()): boolean {
  if (status === 'done') return false;
  const [year, month, day] = iso.split('-').map(Number);
  const due = new Date(year, (month ?? 1) - 1, day);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return due < start;
}

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

type DialogState = { mode: 'create'; status: Status } | { mode: 'edit'; task: Task };

export function App() {
  const [phase, setPhase] = useState<'loading' | 'signed-out' | 'ready'>('loading');
  const [mode, setMode] = useState<'sign-in' | 'register'>('sign-in');
  const [member, setMember] = useState<Member | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [confirmDeleteBoard, setConfirmDeleteBoard] = useState(false);
  const boardLoad = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const token = ++boardLoad.current;
    void (async () => {
      try {
        const current = await api.me();
        if (cancelled) return;
        if (!current) {
          setPhase('signed-out');
          return;
        }
        const list = await api.listBoards();
        if (cancelled) return;
        setMember(current);
        setBoards(list);
        setPhase('ready');
        if (list[0]) {
          setSelectedId(list[0].id);
          setBoardLoading(true);
          const detail = await api.getBoard(list[0].id);
          if (cancelled || token !== boardLoad.current) return;
          setBoard(detail);
          setBoardLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        setError(messageOf(err));
        setPhase('signed-out');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openBoard(id: string) {
    const token = ++boardLoad.current;
    setSelectedId(id);
    setConfirmDeleteBoard(false);
    setBoardLoading(true);
    setError(null);
    try {
      const detail = await api.getBoard(id);
      if (token !== boardLoad.current) return;
      setBoard(detail);
    } catch (err) {
      if (token !== boardLoad.current) return;
      setError(messageOf(err));
    } finally {
      if (token === boardLoad.current) setBoardLoading(false);
    }
  }

  async function onAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    setBusy(true);
    setError(null);
    try {
      const current = mode === 'register' ? await api.register(email, password) : await api.login(email, password);
      const list = await api.listBoards();
      setMember(current);
      setBoards(list);
      setBoard(null);
      setSelectedId(null);
      setPhase('ready');
      if (list[0]) await openBoard(list[0].id);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    setError(null);
    try {
      await api.logout();
    } catch (err) {
      setError(messageOf(err));
      return;
    }
    setMember(null);
    setBoards([]);
    setBoard(null);
    setSelectedId(null);
    setDialog(null);
    setMode('sign-in');
    setPhase('signed-out');
  }

  async function onCreateBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get('name') ?? '');
    setBusy(true);
    setError(null);
    try {
      const created = await api.createBoard(name);
      setBoards((current) => [...current, created]);
      form.reset();
      await openBoard(created.id);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRename(name: string) {
    if (!board) return;
    const updated = await api.renameBoard(board.board.id, name);
    setBoard((current) => (current ? { ...current, board: { ...current.board, name: updated.name } } : current));
    setBoards((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function onDeleteBoard() {
    if (!board) return;
    const boardId = board.board.id;
    await api.deleteBoard(boardId);
    const remaining = boards.filter((item) => item.id !== boardId);
    setBoards(remaining);
    setBoard(null);
    setSelectedId(null);
    setConfirmDeleteBoard(false);
    if (remaining[0]) await openBoard(remaining[0].id);
  }

  async function onSaveTask(input: TaskInput) {
    if (!board) return;
    if (dialog?.mode === 'edit') {
      const task = await api.updateTask(dialog.task.id, input);
      setBoard((current) =>
        current ? { ...current, tasks: current.tasks.map((item) => (item.id === task.id ? task : item)) } : current,
      );
      return;
    }
    const task = await api.createTask(board.board.id, input);
    const boardId = board.board.id;
    setBoard((current) => (current && current.board.id === boardId ? { ...current, tasks: [...current.tasks, task] } : current));
    setBoards((current) => current.map((item) => (item.id === boardId ? { ...item, taskCount: item.taskCount + 1 } : item)));
  }

  async function onDeleteTask(taskId: string) {
    if (!board) return;
    const boardId = board.board.id;
    await api.deleteTask(taskId);
    setBoard((current) =>
      current && current.board.id === boardId
        ? { ...current, tasks: current.tasks.filter((item) => item.id !== taskId) }
        : current,
    );
    setBoards((current) =>
      current.map((item) => (item.id === boardId ? { ...item, taskCount: Math.max(0, item.taskCount - 1) } : item)),
    );
  }

  async function moveTask(taskId: string, status: Status) {
    if (!board) return;
    const currentTask = board.tasks.find((item) => item.id === taskId);
    if (!currentTask || currentTask.status === status) return;
    const boardId = board.board.id;
    const destination = board.tasks.filter((item) => item.status === status);
    const position = destination.reduce((max, item) => Math.max(max, item.position), 0) + 1;
    setBoard((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((item) => (item.id === taskId ? { ...item, status, position } : item)),
          }
        : current,
    );
    try {
      const task = await api.updateTask(taskId, { status });
      setBoard((current) =>
        current ? { ...current, tasks: current.tasks.map((item) => (item.id === task.id ? task : item)) } : current,
      );
    } catch (err) {
      setError(messageOf(err));
      try {
        const detail = await api.getBoard(boardId);
        setBoard(detail);
      } catch {
        // The banner already explains the failed move.
      }
    }
  }

  if (phase === 'loading') {
    return (
      <main className="auth">
        <p role="status">Loading Quay…</p>
      </main>
    );
  }

  if (phase === 'signed-out' || !member) {
    return (
      <main className="auth">
        <section className="auth-panel">
          <div className="brand">
            <span className="mark" aria-hidden="true" />
            <p className="wordmark">Quay</p>
          </div>
          <h1>{mode === 'sign-in' ? 'Sign in to Quay' : 'Join this Quay'}</h1>
          <p className="lede">
            {mode === 'sign-in'
              ? 'The shared board for the people you work with.'
              : 'You join the team on this installation. Everyone here sees the same boards.'}
          </p>
          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
          <form onSubmit={onAuth} className="fields">
            <label>
              Email
              <input name="email" type="email" autoComplete="username" />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </label>
            <button type="submit" disabled={busy}>
              {mode === 'sign-in' ? 'Sign in' : 'Join Quay'}
            </button>
          </form>
          <button
            type="button"
            className="ghost text-button"
            onClick={() => {
              setMode(mode === 'sign-in' ? 'register' : 'sign-in');
              setError(null);
            }}
          >
            {mode === 'sign-in' ? "I'm new here" : 'I already sign in'}
          </button>
        </section>
      </main>
    );
  }

  const selected = boards.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <p className="wordmark">Quay</p>
        </div>
        <div className="who">
          <span>{member.email}</span>
          <button type="button" className="ghost" onClick={() => void onSignOut()}>
            Sign out
          </button>
        </div>
      </header>
      <div className="shell">
        <aside className="sidebar">
          <form aria-label="New board" onSubmit={onCreateBoard} className="fields">
            <label>
              Board name
              <input name="name" placeholder="Launch plan" />
            </label>
            <button type="submit" disabled={busy}>
              Open board
            </button>
          </form>
          <nav aria-label="Boards">
            {boards.length === 0 ? (
              <p className="muted">No boards yet.</p>
            ) : (
              <ul className="board-list">
                {boards.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={item.id === selectedId ? 'page' : undefined}
                      onClick={() => void openBoard(item.id)}
                    >
                      <span>{item.name}</span>
                      <span className="count" aria-hidden="true">
                        {item.taskCount}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
          <p className="team-note">Everyone who signs in here shares these boards.</p>
        </aside>
        <main className="main">
          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
          {!selected && !board ? (
            <section className="empty">
              <h1>No boards yet</h1>
              <p>Nothing is on the wall yet. Open a board for the work this team is carrying.</p>
            </section>
          ) : (
            <BoardView
              name={board?.board.name ?? selected?.name ?? 'Board'}
              detail={board}
              loading={boardLoading}
              confirmDelete={confirmDeleteBoard}
              onAskDelete={() => setConfirmDeleteBoard(true)}
              onKeep={() => setConfirmDeleteBoard(false)}
              onDelete={() => void onDeleteBoard().catch((err) => setError(messageOf(err)))}
              onRename={async (name) => {
                try {
                  await onRename(name);
                } catch (err) {
                  setError(messageOf(err));
                }
              }}
              onAdd={(status) => setDialog({ mode: 'create', status })}
              onEdit={(task) => setDialog({ mode: 'edit', task })}
              onMove={(taskId, status) => void moveTask(taskId, status)}
            />
          )}
        </main>
      </div>
      {dialog && board && (
        <TaskDialog
          dialog={dialog}
          members={board.members}
          onClose={() => setDialog(null)}
          onSave={onSaveTask}
          onDelete={dialog.mode === 'edit' ? () => onDeleteTask(dialog.task.id) : undefined}
        />
      )}
    </div>
  );
}

function BoardView({
  name,
  detail,
  loading,
  confirmDelete,
  onAskDelete,
  onKeep,
  onDelete,
  onRename,
  onAdd,
  onEdit,
  onMove,
}: {
  name: string;
  detail: BoardDetail | null;
  loading: boolean;
  confirmDelete: boolean;
  onAskDelete: () => void;
  onKeep: () => void;
  onDelete: () => void;
  onRename: (name: string) => Promise<void>;
  onAdd: (status: Status) => void;
  onEdit: (task: Task) => void;
  onMove: (taskId: string, status: Status) => void;
}) {
  const [draft, setDraft] = useState(name);
  const [over, setOver] = useState<Status | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragging = useRef<string | null>(null);

  useEffect(() => {
    setDraft(name);
  }, [name]);

  const membersById = new Map((detail?.members ?? []).map((item) => [item.id, item]));

  function beginDrag(event: DragEvent<HTMLElement>, taskId: string) {
    dragging.current = taskId;
    setDraggingId(taskId);
    try {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', taskId);
    } catch {
      // jsdom's dataTransfer is only partly implemented.
    }
  }

  return (
    <section>
      <div className="board-head">
        <div>
          <h1>{name}</h1>
          <p className="lede">Drag a task into another column, or open it to change the details.</p>
        </div>
        <form
          className="rename"
          onSubmit={(event) => {
            event.preventDefault();
            void onRename(draft);
          }}
        >
          <label>
            Rename board
            <input value={draft} onChange={(event) => setDraft(event.target.value)} />
          </label>
          <button type="submit" className="ghost" disabled={draft.trim() === name}>
            Rename
          </button>
        </form>
      </div>
      {confirmDelete ? (
        <div className="confirm">
          <p>Delete {name} and every task on it?</p>
          <button type="button" className="danger" onClick={onDelete}>
            Delete board
          </button>
          <button type="button" className="ghost" onClick={onKeep}>
            Keep board
          </button>
        </div>
      ) : (
        <button type="button" className="ghost text-button" onClick={onAskDelete}>
          Delete board
        </button>
      )}
      {loading || !detail ? (
        <p role="status">Loading the board…</p>
      ) : (
        <div className="board-columns">
          {COLUMNS.map((column) => {
            const tasks = detail.tasks
              .filter((task) => task.status === column.status)
              .sort((a, b) => a.position - b.position);
            return (
              <section
                key={column.status}
                className={over === column.status ? 'column is-over' : 'column'}
                aria-label={column.label}
                data-status={column.status}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOver(column.status);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const taskId = dragging.current;
                  dragging.current = null;
                  setDraggingId(null);
                  setOver(null);
                  if (taskId) onMove(taskId, column.status);
                }}
              >
                <header>
                  <h2>{column.label}</h2>
                  <span className="count" aria-hidden="true">
                    {tasks.length}
                  </span>
                </header>
                {tasks.length === 0 && <p className="muted">Nothing here.</p>}
                {tasks.map((task) => {
                  const assignee = task.assigneeId ? membersById.get(task.assigneeId) : undefined;
                  const overdue = task.dueDate ? isOverdue(task.dueDate, task.status) : false;
                  return (
                    <article
                      key={task.id}
                      aria-label={task.title}
                      className={draggingId === task.id ? 'task is-dragging' : overdue ? 'task overdue' : 'task'}
                      draggable
                      tabIndex={0}
                      onDragStart={(event) => beginDrag(event, task.id)}
                      onDragEnd={() => {
                        dragging.current = null;
                        setDraggingId(null);
                        setOver(null);
                      }}
                      onClick={() => onEdit(task)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onEdit(task);
                        }
                      }}
                    >
                      <h3>{task.title}</h3>
                      {task.description && <p className="description">{task.description}</p>}
                      {(task.dueDate || assignee) && (
                        <footer>
                          {task.dueDate && (
                            <time dateTime={task.dueDate} className={overdue ? 'overdue' : undefined}>
                              {overdue ? 'Overdue' : 'Due'} {formatDue(task.dueDate)}
                            </time>
                          )}
                          {assignee && (
                            <span className="chip">
                              <span className="avatar" aria-hidden="true">
                                {initials(assignee.email)}
                              </span>
                              <span className="email">{assignee.email}</span>
                            </span>
                          )}
                        </footer>
                      )}
                    </article>
                  );
                })}
                <button type="button" className="ghost add" onClick={() => onAdd(column.status)}>
                  Add a task
                </button>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TaskDialog({
  dialog,
  members,
  onClose,
  onSave,
  onDelete,
}: {
  dialog: DialogState;
  members: Member[];
  onClose: () => void;
  onSave: (input: TaskInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const initial = dialog.mode === 'edit' ? dialog.task : null;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<Status>(initial?.status ?? (dialog.mode === 'create' ? dialog.status : 'todo'));
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId ?? '');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave({
        title,
        description,
        status,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      });
      onClose();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="task-dialog-title" className="dialog">
        <h2 id="task-dialog-title">{dialog.mode === 'create' ? 'New task' : 'Edit task'}</h2>
        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}
        <form onSubmit={onSubmit} className="fields">
          <label>
            Title
            <input ref={titleRef} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as Status)}>
              {COLUMNS.map((column) => (
                <option key={column.status} value={column.status}>
                  {column.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Assignee
            <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
          <div className="dialog-actions">
            {onDelete ? (
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void onDelete()
                    .then(onClose)
                    .catch((err) => {
                      setError(messageOf(err));
                      setBusy(false);
                    });
                }}
              >
                Delete task
              </button>
            ) : (
              <span />
            )}
            <div className="end">
              <button type="button" className="ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" disabled={busy}>
                Save task
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
