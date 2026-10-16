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

export function RegisterPage() {
  const { user, ready, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!ready) return <SessionCheck />;
  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
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
      await register(name.trim(), email.trim(), password);
      navigate('/');
    } catch (caught) {
      setError(messageFrom(caught, 'Could not create the account'));
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Use the email your teammates will invite."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-tide underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <Field label="Name" htmlFor="register-name">
          <Input
            id="register-name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10 bg-card"
            required
            disabled={pending}
          />
        </Field>
        <Field label="Email" htmlFor="register-email">
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 bg-card"
            required
            disabled={pending}
          />
        </Field>
        <Field label="Password" htmlFor="register-password" hint="At least 8 characters.">
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
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
          {pending ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
