import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { User } from '@/types/auth';

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

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const { data: { user: supaUser }, error } = await supabase.auth.getUser();

      if (!error && supaUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', supaUser.id)
          .maybeSingle();

        const cleanEmail = (supaUser.email || '').toLowerCase();
        const isAdmin =
          cleanEmail === 'admin@cm.com.br' ||
          cleanEmail === 'adrmin@cm.com.br' ||
          profile?.role === 'admin';

        const user: User = {
          id: supaUser.id,
          name:
            profile?.name ||
            supaUser.user_metadata?.name ||
            (cleanEmail === 'usuario@cm.com.br'
              ? 'Supermercado Parceiro CM'
              : cleanEmail.split('@')[0]),
          email: supaUser.email || cleanEmail,
          role: isAdmin ? 'admin' : 'user',
          status: (profile?.status as 'active' | 'inactive') || 'active',
          cnpj: profile?.cnpj || supaUser.user_metadata?.cnpj,
          unit: profile?.unit || supaUser.user_metadata?.unit,
          createdAt: profile?.created_at || supaUser.created_at,
          mustChangePassword: profile?.must_change_password ?? false,
        };

        return NextResponse.json({ authenticated: true, user });
      }
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('cm_session');

    if (!sessionCookie?.value) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const user = JSON.parse(sessionCookie.value) as User;
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
