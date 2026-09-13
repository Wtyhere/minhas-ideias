import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/api-helpers';

// ─── POST /api/users/update-password ────────────────────────────────────────
// Atualiza a senha do usuário autenticado e remove a flag must_change_password
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, oldPassword, newPassword } = body as {
      email?: string;
      oldPassword?: string;
      newPassword?: string;
    };

    if (!newPassword || newPassword.length < 10) {
      return NextResponse.json(
        { success: false, error: 'A nova senha deve ter no mínimo 10 caracteres.' },
        { status: 400 }
      );
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      return NextResponse.json(
        { success: false, error: 'A nova senha deve ser alfanumérica (conter ao menos uma letra e um número).' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    let userId: string | null = null;
    let userEmail: string | null = (email || '').trim().toLowerCase();

    // 1. Tentar obter usuário via sessão Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createSupabaseServerClient();
        const { data: { user: supaUser } } = await supabase.auth.getUser();
        if (supaUser) {
          userId = supaUser.id;
          userEmail = supaUser.email?.toLowerCase() || userEmail;
        }
      } catch (err) {
        console.warn('[POST /api/users/update-password] Erro ao obter supaUser:', err);
      }
    }

    // 2. Se não encontrou userId pelo Supabase Server Client, tenta pelo cookie cm_session
    if (!userId) {
      const sessionCookie = cookieStore.get('cm_session');
      if (sessionCookie?.value) {
        try {
          const sessionData = JSON.parse(sessionCookie.value);
          if (sessionData?.id) {
            userId = sessionData.id;
          }
          if (sessionData?.email) {
            userEmail = sessionData.email.toLowerCase();
          }
        } catch {
          // ignora erro de parse
        }
      }
    }

    // 3. Se Supabase não estiver configurado (modo mock/desenvolvimento)
    if (!isSupabaseConfigured()) {
      const sessionCookie = cookieStore.get('cm_session');
      if (sessionCookie?.value) {
        try {
          const sessionData = JSON.parse(sessionCookie.value);
          sessionData.mustChangePassword = false;
          cookieStore.set('cm_session', JSON.stringify(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
          });
        } catch {
          // ignora
        }
      }
      return NextResponse.json({
        success: true,
        message: 'Senha alterada com sucesso.',
      });
    }

    const admin = createAdminClient();

    // 4. Se ainda não temos o userId, tenta buscar pelo email
    if (!userId && userEmail) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id, email')
        .eq('email', userEmail)
        .maybeSingle();

      if (profile?.id) {
        userId = profile.id;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Usuário não autenticado ou não encontrado.' },
        { status: 401 }
      );
    }

    // 5. Atualizar senha no Supabase Auth via admin (updateUserById)
    const { error: updateAuthError } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
      user_metadata: {
        must_change_password: false,
      },
    });

    if (updateAuthError) {
      console.error('[POST /api/users/update-password] updateUserById error:', updateAuthError);
      return NextResponse.json(
        { success: false, error: updateAuthError.message || 'Erro ao atualizar senha no Supabase Auth.' },
        { status: 500 }
      );
    }

    // 6. Atualizar must_change_password na tabela profiles
    const { error: profileError } = await admin
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', userId);

    if (profileError) {
      console.error('[POST /api/users/update-password] profiles update error:', profileError);
    }

    // 7. Atualizar cookie de sessão cm_session se existir
    const sessionCookie = cookieStore.get('cm_session');
    if (sessionCookie?.value) {
      try {
        const sessionData = JSON.parse(sessionCookie.value);
        sessionData.mustChangePassword = false;
        cookieStore.set('cm_session', JSON.stringify(sessionData), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });
      } catch (e) {
        console.error('Erro ao atualizar cookie cm_session:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso.',
    });
  } catch (err: any) {
    console.error('[POST /api/users/update-password]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro interno ao alterar a senha.' },
      { status: 500 }
    );
  }
}
