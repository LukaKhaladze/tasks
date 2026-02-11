'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setMessage('Signed in. Redirecting...');
      window.location.href = '/dashboard';
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
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
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-green-400">{message}</p>}
      <button
        type="button"
        disabled={loading || !email || !password}
        onClick={handlePasswordLogin}
        className="w-full rounded-lg bg-accent-500 py-2 font-semibold text-white disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Sign in'}
      </button>
    </div>
  );
}
