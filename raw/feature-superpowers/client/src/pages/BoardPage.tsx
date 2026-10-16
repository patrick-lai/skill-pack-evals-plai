import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError, api, messageFrom } from '../api';
import { useAuth } from '../auth';
import { relocateTask } from '../lib/board';
import type { BoardDetail, Comment, Task } from '../types';
import { BoardColumns } from '../components/BoardColumns';
import { BoardDialog } from '../components/BoardDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MembersDialog } from '../components/MembersDialog';
import { StatusBanner } from '../components/Status';
import { TaskDialog, type TaskDraft } from '../components/TaskDialog';

export function BoardPage() {
  const { boardId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsStatus, setCommentsStatus] = useState<'loading' | 'ready' | 'error'>('ready');
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const commentRequest = useRef(0);

  const load = useCallback(async () => {
    if (!boardId) return;
    try {
      const result = await api<{ board: BoardDetail }>(`/api/boards/${boardId}`);
      setBoard(result.board);
      setPhase('ready');
      setMessage(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setBoard(null);
        setPhase('missing');
        return;
      }
      setPhase((current) => (current === 'ready' ? 'ready' : 'error'));
      setMessage(messageFrom(error, 'Could not load this board'));
    }
  }, [boardId]);

  useEffect(() => {
    setBoard(null);
    setPhase('loading');
    setMessage(null);
    void load();
  }, [load]);

  useEffect(() => {
    document.title = board ? `${board.name} · Quay` : 'Quay';
  }, [board]);

  const loadComments = useCallback(async (taskId: string, quiet = false) => {
    const requestId = ++commentRequest.current;
    if (!quiet) {
      setComments([]);
      setCommentsStatus('loading');
      setCommentsError(null);
    }
    try {
      const result = await api<{ comments: Comment[] }>(`/api/tasks/${taskId}/comments`);
      if (requestId !== commentRequest.current) return;
      setComments(result.comments);
      setCommentsStatus('ready');
      setCommentsError(null);
    } catch (error) {
      if (requestId !== commentRequest.current) return;
      setCommentsStatus('error');
      setCommentsError(messageFrom(error, 'Could not load comments'));
    }
  }, []);

  function openNew() {
    setEditing(null);
    setComments([]);
    setCommentsStatus('ready');
    setCommentsError(null);
    setTaskOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setTaskOpen(true);
    void loadComments(task.id);
  }

  async function onMove(activeId: string, overId: string) {
    if (!board) return;
    const next = relocateTask(board.tasks, activeId, overId);
    if (!next) return;
    const moved = next.find((task) => task.id === activeId);
    const previous = board.tasks.find((task) => task.id === activeId);
    if (!moved || !previous) return;
    if (moved.status === previous.status && moved.position === previous.position) return;
    const snapshot = board;
    setBoard({ ...board, tasks: next });
    try {
      await api(`/api/tasks/${moved.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: moved.status, position: moved.position }),
      });
    } catch (error) {
      setBoard(snapshot);
      setMessage(messageFrom(error, 'Could not move that task. It is back where it was.'));
    }
  }

  async function saveTask(draft: TaskDraft) {
    if (!board) return;
    if (editing) {
      await api(`/api/tasks/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...draft,
          ...(draft.status === editing.status ? { position: editing.position } : {}),
        }),
      });
    } else {
      await api(`/api/boards/${board.id}/tasks`, {
        method: 'POST',
        body: JSON.stringify(draft),
      });
    }
    setTaskOpen(false);
    void load();
  }

  async function deleteTask() {
    if (!editing) return;
    await api(`/api/tasks/${editing.id}`, { method: 'DELETE' });
    setTaskOpen(false);
    void load();
  }

  async function addComment(body: string) {
    if (!editing) return;
    await api(`/api/tasks/${editing.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    await loadComments(editing.id, true);
    await load();
  }

  async function removeComment(commentId: string) {
    if (!editing) return;
    await api(`/api/tasks/${editing.id}/comments/${commentId}`, { method: 'DELETE' });
    await loadComments(editing.id, true);
    await load();
  }

  if (phase === 'loading') {
    return <p className="text-sm text-muted-foreground">Opening the board…</p>;
  }

  if (phase === 'missing') {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/70 px-6 py-14 text-center">
        <h1 className="font-serif text-3xl tracking-tight">This board is not on your dock</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been deleted, or you are not a member.
        </p>
        <Button type="button" className="mt-6 h-10" onClick={() => navigate('/')}>
          Back to boards
        </Button>
      </div>
    );
  }

  if (phase === 'error' || !board || !user) {
    return (
      <div className="grid gap-4">
        <StatusBanner message={message ?? 'Could not load this board'} onRetry={() => void load()} />
        <Link to="/" className="text-sm text-tide underline-offset-4 hover:underline">
          Back to boards
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Boards
        </Link>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="min-w-0">
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Board</p>
            <h1 className="font-serif text-4xl tracking-tight">{board.name}</h1>
            {board.description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{board.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setPeopleOpen(true)}>
              People · {board.members.length}
            </Button>
            {board.role === 'owner' ? (
              <>
                <Button type="button" variant="outline" onClick={() => setRenameOpen(true)}>
                  Rename
                </Button>
                <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Delete
                </Button>
              </>
            ) : null}
            <Button type="button" className="h-8 px-3" onClick={openNew}>
              New task
            </Button>
          </div>
        </div>
      </div>

      {message ? <StatusBanner message={message} /> : null}

      <p className="text-sm text-muted-foreground lg:sr-only">
        Drag a card by its grip, or open it with the pencil to change status.
      </p>

      <BoardColumns tasks={board.tasks} onMove={(activeId, overId) => void onMove(activeId, overId)} onOpen={openEdit} />

      <TaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        task={editing}
        members={board.members}
        onSave={saveTask}
        onDelete={editing ? deleteTask : undefined}
        comments={
          editing
            ? {
                status: commentsStatus,
                comments,
                error: commentsError,
                currentUserId: user.id,
                onAdd: addComment,
                onDelete: removeComment,
                onRetry: () => void loadComments(editing.id),
              }
            : undefined
        }
      />
      <BoardDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        mode="rename"
        initial={{ name: board.name, description: board.description }}
        onSave={async (input) => {
          await api(`/api/boards/${board.id}`, {
            method: 'PATCH',
            body: JSON.stringify(input),
          });
          setRenameOpen(false);
          await load();
        }}
      />
      <MembersDialog
        open={peopleOpen}
        onOpenChange={setPeopleOpen}
        members={board.members}
        currentUserId={user.id}
        isOwner={board.role === 'owner'}
        onInvite={async (email) => {
          await api(`/api/boards/${board.id}/members`, {
            method: 'POST',
            body: JSON.stringify({ email }),
          });
          await load();
        }}
        onRemove={async (userId) => {
          await api(`/api/boards/${board.id}/members/${userId}`, { method: 'DELETE' });
          if (userId === user.id) {
            navigate('/');
            return;
          }
          await load();
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this board?"
        description={`Tasks on ${board.name} will be removed for everyone on it.`}
        confirmLabel="Delete board"
        pending={deleting}
        onConfirm={() => {
          setDeleting(true);
          void api(`/api/boards/${board.id}`, { method: 'DELETE' })
            .then(() => navigate('/'))
            .catch((error: unknown) => {
              setMessage(messageFrom(error, 'Could not delete the board'));
              setDeleting(false);
              setDeleteOpen(false);
            });
        }}
      />
    </div>
  );
}
