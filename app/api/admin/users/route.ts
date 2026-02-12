import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: currentProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (currentProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, name } = body as {
    email: string;
    password?: string;
    name?: string;
  };

  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const cleanEmail = email?.trim();
  const cleanPassword = password?.trim();

  const { data, error } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password: cleanPassword,
    email_confirm: true
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? 'Create user failed' }, { status: 400 });
  }

  await admin.from('profiles').update({ name: name ?? null }).eq('id', data.user.id);

  return NextResponse.json({ id: data.user.id });
}
