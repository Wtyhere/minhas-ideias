import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { INITIAL_USERS } from '@/lib/auth';
import { User } from '@/types/auth';

function isSupabaseAdminConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    url &&
    anonKey &&
    serviceKey &&
    !url.includes('your-project') &&
    url.startsWith('http')
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, newPassword } = body as { email?: string; newPassword?: string };

    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'E-mail é obrigatório.' },
        { status: 400 }
      );
    }

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

    // Se Supabase estiver configurado com service role
    if (isSupabaseAdminConfigured()) {
      const admin = createAdminClient();

      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profileError || !profile) {
        return NextResponse.json(
          { success: false, error: 'Usuário não encontrado no sistema.' },
          { status: 404 }
        );
      }

      if (profile.status === 'inactive') {
        return NextResponse.json(
          { success: false, error: 'Acesso bloqueado: Este usuário está Inativo.' },
          { status: 403 }
        );
      }

      // Atualiza senha no Supabase Auth via Admin
      const { error: updateAuthError } = await admin.auth.admin.updateUserById(profile.id, {
        password: newPassword,
        user_metadata: {
          ...profile,
          must_change_password: false,
        },
      });

      if (updateAuthError) {
        console.error('[POST /api/auth/set-initial-password] updateUserById error:', updateAuthError);
        return NextResponse.json(
          { success: false, error: updateAuthError.message || 'Erro ao cadastrar senha no Supabase Auth.' },
          { status: 500 }
        );
      }

      // Atualiza profiles
      const { error: updateProfileError } = await admin
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', profile.id);

      if (updateProfileError) {
        console.error('[POST /api/auth/set-initial-password] profiles update error:', updateProfileError);
      }

      // Cria sessão no Supabase Auth
      try {
        const supabase = await createSupabaseServerClient();
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: newPassword,
        });
      } catch (authErr) {
        console.warn('Aviso: sessão Supabase Server Client pós-cadastro:', authErr);
      }

      const isAdmin = profile.role === 'admin';
      const userObj: User = {
        id: profile.id,
        name: profile.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: isAdmin ? 'admin' : 'user',
        status: profile.status || 'active',
        cnpj: profile.cnpj || (isAdmin ? '03.882.112/0001-40' : '07.123.456/0001-89'),
        unit: profile.unit || (isAdmin ? 'P&D Casa Magalhães' : 'Loja Matriz - Supermercado Modelo'),
        createdAt: profile.created_at || new Date().toISOString().split('T')[0],
        mustChangePassword: false,
      };

      const cookieStore = await cookies();
      cookieStore.set('cm_session', JSON.stringify(userObj), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return NextResponse.json({
        success: true,
        message: 'Senha cadastrada com sucesso!',
        user: userObj,
      });
    }

    // Modo Mock de desenvolvimento
    const registeredUser = INITIAL_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (registeredUser) {
      registeredUser.mustChangePassword = false;
      const userObj: User = {
        ...registeredUser,
        mustChangePassword: false,
      };

      const cookieStore = await cookies();
      cookieStore.set('cm_session', JSON.stringify(userObj), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return NextResponse.json({
        success: true,
        message: 'Senha cadastrada com sucesso!',
        user: userObj,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Usuário não localizado para cadastro de senha.' },
      { status: 404 }
    );
  } catch (err: unknown) {
    console.error('[POST /api/auth/set-initial-password]', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao cadastrar senha de acesso.' },
      { status: 500 }
    );
  }
}
