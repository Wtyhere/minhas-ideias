import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { syncUserDismissedRejected } from '@/lib/dismissed-rejected-store';
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ideaIds: string[] = Array.isArray(body?.ideaIds)
      ? body.ideaIds.filter((id: unknown): id is string => typeof id === 'string' && Boolean(id.trim()))
      : body?.ideaId && typeof body.ideaId === 'string'
      ? [body.ideaId]
      : [];

    if (!ideaIds.length) {
      return NextResponse.json(
        { success: false, error: 'Nenhum ID de ideia fornecido.' },
        { status: 400 }
      );
    }

    let userId: string | null = null;
    let userEmail: string | null = null;
    let sessionUser: User | null = null;

    // 1. Tenta identificar o usuário via Supabase Auth
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createSupabaseServerClient();
        const { data: { user: supaUser } } = await supabase.auth.getUser();
        if (supaUser) {
          userId = supaUser.id;
          userEmail = supaUser.email || null;
        }
      } catch (err) {
        console.warn('[POST /api/users/dismiss-rejected-ideas] erro ao consultar supabase auth:', err);
      }
    }

    // 2. Se não encontrou no Supabase, tenta o cookie de sessão 'cm_session'
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('cm_session');
    if (sessionCookie?.value) {
      try {
        sessionUser = JSON.parse(sessionCookie.value) as User;
        if (!userId && sessionUser.id) userId = sessionUser.id;
        if (!userEmail && sessionUser.email) userEmail = sessionUser.email;
      } catch {
        // Ignora erro de parse
      }
    }

    if (!userEmail && !userId) {
      return NextResponse.json(
        { success: false, error: 'Usuário não autenticado.' },
        { status: 401 }
      );
    }

    // 3. Sincroniza os IDs dispensados de forma persistente (Supabase Auth user_metadata + server store)
    const updatedIds = await syncUserDismissedRejected(userId, userEmail, ideaIds);

    // 4. Se houver cookie de sessão ativo, atualiza-o com a nova lista de IDs dispensados
    if (sessionUser) {
      const updatedUser: User = {
        ...sessionUser,
        dismissedRejectedIdeaIds: updatedIds,
      };
      cookieStore.set('cm_session', JSON.stringify(updatedUser), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return NextResponse.json({
      success: true,
      dismissedRejectedIdeaIds: updatedIds,
    });
  } catch (err: unknown) {
    console.error('[POST /api/users/dismiss-rejected-ideas]', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar ideias recusadas dispensadas.' },
      { status: 500 }
    );
  }
}
