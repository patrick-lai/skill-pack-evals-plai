import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BoardSummary } from '@boardline/shared';
import { BoardList } from './BoardList';

const boards: BoardSummary[] = [
  { id: '1', name: 'Launch', role: 'owner', taskCount: 3, createdAt: '2026-10-15T00:00:00.000Z' },
  { id: '2', name: 'Quiet', role: 'member', taskCount: 1, createdAt: '2026-10-15T01:00:00.000Z' },
];

describe('BoardList', () => {
  it('renders each board and submits a new board name', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<BoardList boards={boards} onCreate={onCreate} onOpen={() => {}} />);

    expect(screen.getByText('Launch')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('3 tasks')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.getByText('1 task')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Board name'), 'Ops');
    await user.click(screen.getByRole('button', { name: 'New board' }));
    expect(onCreate).toHaveBeenCalledWith('Ops');
  });
});
