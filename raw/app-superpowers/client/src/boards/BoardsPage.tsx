import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { BoardSummary } from '@boardline/shared';
import { ApiError, api } from '../api';
import { TopBar } from '../TopBar';
import { BoardList } from './BoardList';

export function BoardsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice ?? null;
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const body = await api<{ boards: BoardSummary[] }>('/api/boards');
      setBoards(body.boards);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(name: string) {
    setError(null);
    try {
      const board = await api<BoardSummary>('/api/boards', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      navigate(`/boards/${board.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong.');
    }
  }

  return (
    <div className="app-shell">
      <TopBar />
      <main className="page">
        <h1>Boards</h1>
        {notice && (
          <p className="banner" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="banner error" role="alert">
            {error}{' '}
            <button className="text-button" type="button" onClick={() => void load()}>
              Try again
            </button>
          </p>
        )}
        {boards === null && !error ? <p className="loading">Loading boards…</p> : null}
        {boards && <BoardList boards={boards} onCreate={(name) => void onCreate(name)} onOpen={(id) => navigate(`/boards/${id}`)} />}
      </main>
    </div>
  );
}
