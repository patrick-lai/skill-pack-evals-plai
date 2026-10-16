import { useState } from 'react';
import type { User } from '@boardline/shared';
import { ApiError, api } from '../api';
import { AuthForm, type AuthMode, type AuthValues } from './AuthForm';

export function AuthPage({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(values: AuthValues) {
    setPending(true);
    setError(null);
    try {
      const path = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = await api<{ user: User }>(path, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      onAuthenticated(body.user);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-screen">
      <aside className="auth-aside">
        <p className="brand">Boardline</p>
        <h1>The work, where the team can see it.</h1>
        <p className="lede">
          A board for the few people actually doing the work. Three columns. Names on the cards.
          Nothing else in the way.
        </p>
      </aside>
      <main className="auth-panel">
        <AuthForm
          mode={mode}
          pending={pending}
          error={error}
          onToggle={() => {
            setMode((current) => (current === 'sign-in' ? 'register' : 'sign-in'));
            setError(null);
          }}
          onSubmit={(values) => void onSubmit(values)}
        />
      </main>
    </div>
  );
}
