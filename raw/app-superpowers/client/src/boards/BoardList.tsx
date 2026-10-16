import type { FormEvent } from 'react';
import type { BoardSummary } from '@boardline/shared';

function taskCount(count: number): string {
  return count === 1 ? '1 task' : `${count} tasks`;
}

export function BoardList({
  boards,
  onCreate,
  onOpen,
}: {
  boards: BoardSummary[];
  onCreate: (name: string) => void;
  onOpen: (id: string) => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onCreate(String(data.get('name') ?? ''));
    event.currentTarget.reset();
  }

  return (
    <div className="board-list">
      <form className="create-row" onSubmit={handleSubmit}>
        <label>
          Board name
          <input name="name" placeholder="Sprint, hiring, launch…" />
        </label>
        <button className="button primary" type="submit">
          New board
        </button>
      </form>
      {boards.length === 0 ? (
        <p className="empty">No boards yet. Name one and start a column of work.</p>
      ) : (
        <ul className="board-rows">
          {boards.map((board) => (
            <li key={board.id}>
              <button className="board-row" type="button" onClick={() => onOpen(board.id)}>
                <span className="board-row-name">{board.name}</span>
                <span className="role">{board.role === 'owner' ? 'Owner' : 'Member'}</span>
                <span className="count">{taskCount(board.taskCount)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
