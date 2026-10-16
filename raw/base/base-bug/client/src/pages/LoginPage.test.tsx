import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth';
import { LoginForm, LoginPage } from './LoginPage';

describe('LoginForm', () => {
  it('asks for a longer password before submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <MemoryRouter>
        <LoginForm onSubmit={onSubmit} />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Enter the board' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i);
  });

  it('submits email and password', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <LoginForm onSubmit={onSubmit} />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Enter the board' }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'password123',
    });
  });
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'Sign in required' }), { status: 401 })),
    );
  });

  it('links to account creation', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    const link = await screen.findByRole('link', { name: 'Create an account' });
    expect(link).toHaveAttribute('href', '/register');
  });
});
