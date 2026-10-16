import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { api, messageFrom } from '../api';
import { STATUS_META } from '../lib/board';
import { formatUpdated } from '../lib/dates';
import { initials } from '../lib/text';
import type { BoardDetail, BoardSummary } from '../types';
import { BoardDialog } from '../components/BoardDialog';
import { LoadingBlock, StatusBanner } from '../components/Status';

export function BoardsPage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api<{ boards: BoardSummary[] }>('/api/boards');
      setBoards(result.boards);
      setPhase('ready');
      setMessage(null);
    } catch (error) {
      setPhase('error');
      setMessage(messageFrom(error, 'Could not load your boards'));
    }
  }, []);

  useEffect(() => {
    document.title = 'Boards · Quay';
    void load();
  }, [load]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Workspace</p>
          <h1 className="font-serif text-4xl tracking-tight">Boards</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Each board is a shared dock for one stream of work.
          </p>
        </div>
        <Button type="button" className="h-10 px-4" onClick={() => setCreating(true)}>
          New board
        </Button>
      </div>

      {message ? <StatusBanner message={message} onRetry={() => void load()} /> : null}

      {phase === 'loading' ? <LoadingBlock label="Opening your boards…" /> : null}

      {phase === 'ready' && boards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/70 px-6 py-14 text-center">
          <h2 className="font-serif text-3xl tracking-tight">Nothing is docked yet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Create a board, invite the people doing the work, and drag tasks across To do, Doing, and
            Done.
          </p>
          <Button type="button" className="mt-6 h-10 px-4" onClick={() => setCreating(true)}>
            Create the first board
          </Button>
        </div>
      ) : null}

      {phase === 'ready' && boards.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                to={`/boards/${board.id}`}
                className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-[0_1px_0_rgba(28,25,21,0.04)] transition hover:-translate-y-0.5 hover:border-tide/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-serif text-2xl leading-tight tracking-tight">{board.name}</h2>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {board.role === 'owner' ? 'Owner' : 'Member'}
                  </span>
                </div>
                {board.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{board.description}</p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No description yet.</p>
                )}
                <p className="mt-4 text-sm">
                  {(['todo', 'doing', 'done'] as const).map((status, index) => (
                    <span key={status}>
                      {index > 0 ? <span className="px-1.5 text-muted-foreground">·</span> : null}
                      <span>
                        {board.counts[status]} {STATUS_META[status].label.toLowerCase()}
                      </span>
                    </span>
                  ))}
                </p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex -space-x-2">
                    {board.members.slice(0, 4).map((member) => (
                      <span
                        key={member.id}
                        title={member.name}
                        className="grid size-7 place-items-center rounded-full border-2 border-card bg-secondary text-[10px] font-semibold"
                      >
                        {initials(member.name)}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatUpdated(board.updatedAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <BoardDialog
        open={creating}
        onOpenChange={setCreating}
        mode="create"
        onSave={async (input) => {
          const result = await api<{ board: BoardDetail }>('/api/boards', {
            method: 'POST',
            body: JSON.stringify(input),
          });
          setCreating(false);
          navigate(`/boards/${result.board.id}`);
        }}
      />
    </div>
  );
}
