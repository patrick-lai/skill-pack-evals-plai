import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthForm } from './AuthForm';

describe('AuthForm', () => {
  it('submits the email and password that were typed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AuthForm mode="sign-in" pending={false} error={null} onToggle={() => {}} onSubmit={onSubmit} />,
    );

    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'password1' });
  });

  it('shows the name field when creating an account', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AuthForm mode="register" pending={false} error={null} onToggle={() => {}} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password1',
    });
  });

  it('shows the API error', () => {
    render(
      <AuthForm
        mode="sign-in"
        pending={false}
        error="Email or password is incorrect."
        onToggle={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText('Email or password is incorrect.')).toBeInTheDocument();
  });
});
