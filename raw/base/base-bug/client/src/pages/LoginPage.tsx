import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messageFrom } from '../api';
import { useAuth } from '../auth';
import { AuthLayout } from '../components/AuthLayout';
import { Field } from '../components/Field';
import { SessionCheck } from '../components/Status';

export function LoginForm({
  onSubmit,
}: {
  onSubmit: (input: { email: string; password: string }) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit({ email: email.trim(), password });
    } catch (caught) {
      setError(messageFrom(caught, 'Could not sign in'));
      setPending(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      <Field label="Email" htmlFor="login-email">
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 bg-card"
          required
          disabled={pending}
        />
      </Field>
      <Field label="Password" htmlFor="login-password">
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-10 bg-card"
          required
          disabled={pending}
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-rust">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="h-10">
        {pending ? 'Signing in…' : 'Enter the board'}
      </Button>
    </form>
  );
}

export function LoginPage() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();

  if (!ready) return <SessionCheck />;
  if (user) return <Navigate to="/" replace />;

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Pick up the boards you already share."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-tide underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm
        onSubmit={async (input) => {
          await login(input.email, input.password);
          navigate('/');
        }}
      />
    </AuthLayout>
  );
}
