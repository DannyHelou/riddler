'use client';
import { useActionState } from 'react';
import { login } from '../actions';

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="password" className="panel-note">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        className="border border-[var(--line)] bg-[var(--panel)] px-3 py-2 font-[family-name:var(--font-body)] text-[22px] text-[var(--moonlight)] outline-none focus-visible:border-[var(--you)]"
      />
      {error && (
        <p role="alert" className="m-0 text-[20px] text-[var(--flare)]">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Checking…' : 'Log in'}
      </button>
    </form>
  );
}
