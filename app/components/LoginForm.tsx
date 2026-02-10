'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMagic = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) {
      setError(error.message);
    } else {
      setMessage('Magic link sent. Check your inbox.');
    }
    setLoading(false);
  };

  const handlePassword = async (type: 'signin' | 'signup') => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const action =
      type === 'signin'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await action;
    if (error) {
      setError(error.message);
    } else {
      setMessage(type === 'signup' ? 'Account created. You are signed in.' : 'Signed in.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('magic')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === 'magic'
              ? 'bg-accent-500 text-white'
              : 'bg-board-800 text-board-300'
          }`}
        >
          Magic Link
        </button>
        <button
          type="button"
          onClick={() => setMode('password')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === 'password'
              ? 'bg-accent-500 text-white'
              : 'bg-board-800 text-board-300'
          }`}
        >
          Email + Password
        </button>
      </div>
      <div className="space-y-3">
        <label className="text-sm text-board-300">Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg bg-board-850 border border-board-700 px-3 py-2 text-white"
          placeholder="you@company.com"
        />
      </div>
      {mode === 'password' && (
        <div className="space-y-3">
          <label className="text-sm text-board-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg bg-board-850 border border-board-700 px-3 py-2 text-white"
            placeholder="••••••••"
          />
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-green-400">{message}</p>}
      {mode === 'magic' ? (
        <button
          type="button"
          disabled={loading || !email}
          onClick={handleMagic}
          className="w-full rounded-lg bg-accent-500 py-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send magic link'}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={loading || !email || !password}
            onClick={() => handlePassword('signin')}
            className="rounded-lg bg-accent-500 py-2 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Sign in'}
          </button>
          <button
            type="button"
            disabled={loading || !email || !password}
            onClick={() => handlePassword('signup')}
            className="rounded-lg bg-board-800 py-2 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Sign up'}
          </button>
        </div>
      )}
    </div>
  );
}
