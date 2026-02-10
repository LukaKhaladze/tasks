import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import LoginForm from '@/app/components/LoginForm';

export default async function LoginPage() {
  const supabase = createServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl bg-board-900/90 border border-board-700/60 shadow-glow p-8">
        <h1 className="text-3xl font-semibold mb-2">Sign in</h1>
        <p className="text-board-300 mb-6">
          Access the realtime project manager.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
