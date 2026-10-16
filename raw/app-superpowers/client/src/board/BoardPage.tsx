import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { BoardDetail, Task, TaskStatus } from '@boardline/shared';
import { ApiError, api } from '../api';
import { TopBar } from '../TopBar';
import { Kanban } from './Kanban';
import { moveTask, todayISO } from './moveTask';
import { TaskDialog, type TaskDraft } from './TaskDialog';

export function BoardPage() {
  const { boardId = '' } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const [pending, setPending] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const detail = await api<BoardDetail>(`/api/boards/${boardId}`);
        if (!cancelled) {
          setBoard(detail);
          setError(null);
        }
      } catch (caught) {
        if (cancelled) return;
        if (caught instanceof ApiError && (caught.status === 404 || caught.status === 403)) {
          navigate('/', { replace: true, state: { notice: 'That board is not available.' } });
          return;
        }
        setError(caught instanceof ApiError ? caught.message : 'Something went wrong.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [boardId, navigate]);

  async function reload(): Promise<BoardDetail> {
    const detail = await api<BoardDetail>(`/api/boards/${boardId}`);
    setBoard(detail);
    return detail;
  }

  async function onMove(taskId: string, status: TaskStatus, position?: number) {
    if (!board) return;
    const previous = board.tasks;
    setBanner(null);
    setBoard({ ...board, tasks: moveTask(board.tasks, taskId, status, position) });
    try {
      const body = position == null ? { status } : { status, position };
      await api(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) });
      await reload();
    } catch (caught) {
      setBoard((current) => (current ? { ...current, tasks: previous } : current));
      setBanner(caught instanceof ApiError ? caught.message : 'Something went wrong.');
    }
  }

  async function onSave(draft: TaskDraft) {
    setPending(true);
    setDialogError(null);
    try {
      if (editing === 'new') {
        await api(`/api/boards/${boardId}/tasks`, { method: 'POST', body: JSON.stringify(draft) });
      } else if (editing) {
        await api(`/api/tasks/${editing.id}`, { method: 'PATCH', body: JSON.stringify(draft) });
      }
      await reload();
      setEditing(null);
    } catch (caught) {
      setDialogError(caught instanceof ApiError ? caught.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  async function onDeleteTask() {
    if (!editing || editing === 'new') return;
    setPending(true);
    setDialogError(null);
    try {
      await api(`/api/tasks/${editing.id}`, { method: 'DELETE' });
      await reload();
      setEditing(null);
    } catch (caught) {
      setDialogError(caught instanceof ApiError ? caught.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setInviteError(null);
    try {
      await api(`/api/boards/${boardId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: String(data.get('email') ?? '') }),
      });
      await reload();
      setInviteOpen(false);
    } catch (caught) {
      setInviteError(caught instanceof ApiError ? caught.message : 'Something went wrong.');
    }
  }

  async function onDeleteBoard() {
    try {
      await api(`/api/boards/${boardId}`, { method: 'DELETE' });
      navigate('/');
    } catch (caught) {
      setBanner(caught instanceof ApiError ? caught.message : 'Something went wrong.');
      setConfirmDelete(false);
    }
  }

  return (
    <div className="app-shell">
      <TopBar />
      <main className="page board-page">
        {!board && !error ? <p className="loading">Loading board…</p> : null}
        {error && (
          <p className="banner error" role="alert">
            {error}
          </p>
        )}
        {board && (
          <>
            <header className="board-head">
              <div>
                <p className="eyebrow">{board.role === 'owner' ? 'Owner' : 'Member'}</p>
                <h1>{board.name}</h1>
              </div>
              <ul className="avatars">
                {board.members.map((member) => (
                  <li key={member.id} title={member.name}>
                    {initials(member.name)}
                  </li>
                ))}
              </ul>
              <div className="board-actions">
                {board.role === 'owner' && (
                  <button className="button" type="button" onClick={() => { setInviteOpen(true); setInviteError(null); }}>
                    Invite
                  </button>
                )}
                {board.role === 'owner' && (
                  <button className="button danger" type="button" onClick={() => setConfirmDelete(true)}>
                    Delete board
                  </button>
                )}
                <button className="button primary" type="button" onClick={() => { setEditing('new'); setDialogError(null); }}>
                  Add task
                </button>
              </div>
            </header>
            {banner && (
              <p className="banner error" role="alert">
                {banner}
              </p>
            )}
            {inviteOpen && (
              <form className="invite-panel" onSubmit={(event) => void onInvite(event)}>
                <label>
                  Email
                  <input name="email" type="email" required placeholder="grace@example.com" />
                </label>
                <button className="button primary" type="submit">
                  Add member
                </button>
                <button className="button" type="button" onClick={() => setInviteOpen(false)}>
                  Close
                </button>
                {inviteError && (
                  <p className="form-error" role="alert">
                    {inviteError}
                  </p>
                )}
              </form>
            )}
            <Kanban
              tasks={board.tasks}
              members={board.members}
              today={todayISO()}
              onOpen={(task) => {
                setEditing(task);
                setDialogError(null);
              }}
              onMove={(taskId, status, position) => void onMove(taskId, status, position)}
            />
          </>
        )}
      </main>
      {editing !== null && board && (
        <TaskDialog
          key={editing === 'new' ? 'new' : editing.id}
          task={editing === 'new' ? null : editing}
          members={board.members}
          pending={pending}
          error={dialogError}
          onClose={() => setEditing(null)}
          onSave={(draft) => void onSave(draft)}
          onDelete={editing === 'new' ? undefined : () => void onDeleteTask()}
        />
      )}
      {confirmDelete && (
        <div className="dialog-backdrop" onMouseDown={() => setConfirmDelete(false)}>
          <div
            className="dialog confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-board-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="delete-board-title">Delete this board and its tasks?</h2>
            <div className="dialog-actions">
              <button className="button danger" type="button" onClick={() => void onDeleteBoard()}>
                Delete
              </button>
              <button className="button" type="button" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
