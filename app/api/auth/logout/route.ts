import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes('your-project') &&
    url.startsWith('http')
  );
}

export async function POST() {
  try {
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    }

    const cookieStore = await cookies();
    cookieStore.delete('cm_session');

    return NextResponse.json({ success: true, message: 'Sessão encerrada com sucesso.' });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro ao encerrar sessão.' },
      { status: 500 }
    );
  }
}
