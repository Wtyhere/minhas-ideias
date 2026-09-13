import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes('your-project') &&
    url.startsWith('http')
  );
}

/**
 * Verifica se o usuário autenticado na sessão atual é admin.
 * Retorna { isAdmin: true, supaUser } ou { isAdmin: false, error, status }.
 */
export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: supaUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !supaUser) {
    return { isAdmin: false, error: 'Não autenticado.', status: 401 } as const;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', supaUser.id)
    .maybeSingle();

  const cleanEmail = (supaUser.email || '').toLowerCase();
  const isAdmin =
    cleanEmail === 'admin@cm.com.br' ||
    cleanEmail === 'adrmin@cm.com.br' ||
    profile?.role === 'admin';

  if (!isAdmin) {
    return { isAdmin: false, error: 'Acesso restrito a administradores.', status: 403 } as const;
  }

  return { isAdmin: true, supaUser } as const;
}
