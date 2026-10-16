import type { FormEvent } from 'react';

export type AuthMode = 'sign-in' | 'register';

export type AuthValues = {
  name?: string;
  email: string;
  password: string;
};

type AuthFormProps = {
  mode: AuthMode;
  pending: boolean;
  error: string | null;
  onToggle: () => void;
  onSubmit: (values: AuthValues) => void;
};

export function AuthForm({ mode, pending, error, onToggle, onSubmit }: AuthFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');
    if (mode === 'register') {
      onSubmit({ name: String(data.get('name') ?? ''), email, password });
      return;
    }
    onSubmit({ email, password });
  }

  const submitLabel = pending
    ? mode === 'register'
      ? 'Creating account…'
      : 'Signing in…'
    : mode === 'register'
      ? 'Create account'
      : 'Sign in';

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>{mode === 'register' ? 'Create account' : 'Sign in'}</h2>
      {mode === 'register' && (
        <label>
          Name
          <input name="name" autoComplete="name" required />
        </label>
      )}
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          required
          minLength={8}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" type="submit" disabled={pending}>
        {submitLabel}
      </button>
      <button className="text-button" type="button" onClick={onToggle}>
        {mode === 'register' ? 'Have an account? Sign in' : 'Create an account'}
      </button>
    </form>
  );
}
