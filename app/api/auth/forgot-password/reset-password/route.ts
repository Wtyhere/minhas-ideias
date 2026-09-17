import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { INITIAL_USERS } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/api-helpers';
import { verifyResetCode, consumeResetCode } from '@/lib/password-reset-store';
import { User } from '@/types/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code, newPassword } = body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'E-mail não informado.' },
        { status: 400 }
      );
    }

    if (!cleanCode || cleanCode.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Por favor, informe o código de verificação de 6 dígitos recebido por e-mail.' },
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

    // 1. Validação do código de verificação
    let codeIsValid = false;
    let verificationError = '';
    const { isCodeVerified } = await import('@/lib/password-reset-store');
    if (isCodeVerified(cleanEmail)) {
      codeIsValid = true;
    } else {
      const verification = verifyResetCode(cleanEmail, cleanCode);
      codeIsValid = verification.valid;
      if (!codeIsValid) {
        verificationError = verification.error || '';
      }
    }

    // Fallback: se o store em memória não encontrar (ex: reinício de servidor), tenta validar via Supabase verifyOtp
    if (!codeIsValid && isSupabaseConfigured()) {
      try {
        const supabase = await createSupabaseServerClient();
        const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: 'recovery',
        });
        if (!otpError && otpData.user) {
          codeIsValid = true;
        }
      } catch (e) {
        console.warn('[reset-password] Erro no fallback verifyOtp:', e);
      }
    }

    if (!codeIsValid) {
      return NextResponse.json(
        {
          success: false,
          error: verificationError || 'Código de verificação incorreto ou expirado. Por favor, tente novamente.',
        },
        { status: 400 }
      );
    }

    // 2. Fluxo Supabase
    if (isSupabaseConfigured()) {
      const admin = createAdminClient();

      // Busca perfil do usuário
      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profileError) {
        console.error('[reset-password] Erro ao buscar perfil:', profileError);
      }

      let userId = profile?.id;

      // Se não encontrou no profiles, busca no Supabase Auth
      if (!userId) {
        try {
          const { data: authUsers } = await admin.auth.admin.listUsers();
          const found = authUsers?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (found) {
            userId = found.id;
          }
        } catch (e) {
          console.warn('[reset-password] Erro ao listar auth users:', e);
        }
      }

      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Usuário não localizado para redefinição de senha.' },
          { status: 404 }
        );
      }

      if (profile && profile.status === 'inactive') {
        return NextResponse.json(
          { success: false, error: 'Acesso bloqueado: Este usuário está inativo.' },
          { status: 403 }
        );
      }

      // Atualiza senha no Supabase Auth via Admin
      const { error: updateAuthError } = await admin.auth.admin.updateUserById(userId, {
        password: newPassword,
        user_metadata: {
          ...(profile || {}),
          must_change_password: false,
        },
      });

      if (updateAuthError) {
        console.error('[reset-password] updateUserById error:', updateAuthError);
        return NextResponse.json(
          { success: false, error: updateAuthError.message || 'Erro ao atualizar senha no Supabase Auth.' },
          { status: 500 }
        );
      }

      // Atualiza tabela profiles
      const { error: updateProfileError } = await admin
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', userId);

      if (updateProfileError) {
        console.error('[reset-password] profiles update error:', updateProfileError);
      }

      // Constrói objeto de usuário da sessão
      const isAdmin = profile?.role === 'admin' || cleanEmail === 'admin@cm.com.br' || cleanEmail === 'adrmin@cm.com.br';
      const userObj: User = {
        id: userId,
        name: profile?.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: isAdmin ? 'admin' : 'user',
        status: (profile?.status as 'active' | 'inactive') || 'active',
        cnpj: profile?.cnpj || (isAdmin ? '03.882.112/0001-40' : '07.123.456/0001-89'),
        unit: profile?.unit || (isAdmin ? 'P&D Casa Magalhães' : 'Loja Matriz - Supermercado Modelo'),
        createdAt: profile?.created_at || new Date().toISOString().split('T')[0],
        mustChangePassword: false,
      };

      // Invalida o código no repositório
      consumeResetCode(cleanEmail);

      return NextResponse.json({
        success: true,
        message: 'Senha redefinida com sucesso!',
      });
    }

    // 3. Fallback de desenvolvimento (Mock)
    const registeredUser = INITIAL_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    const isAdmin =
      cleanEmail === 'admin@cm.com.br' || cleanEmail === 'adrmin@cm.com.br';

    let userObj: User;

    if (registeredUser) {
      registeredUser.mustChangePassword = false;
      userObj = {
        ...registeredUser,
        mustChangePassword: false,
      };
    } else if (isAdmin) {
      userObj = {
        id: 'usr-admin',
        email: cleanEmail,
        name: 'Administrador Casa Magalhães',
        role: 'admin',
        status: 'active',
        cnpj: '03.882.112/0001-40',
        unit: 'P&D Casa Magalhães',
        createdAt: '2026-01-01',
        mustChangePassword: false,
      };
    } else {
      userObj = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        role: 'user',
        status: 'active',
        unit: 'Loja Matriz - Supermercado Parceiro',
        createdAt: new Date().toISOString().split('T')[0],
        mustChangePassword: false,
      };
    }

    consumeResetCode(cleanEmail);

    return NextResponse.json({
      success: true,
      message: 'Senha redefinida com sucesso!',
      user: {
        name: userObj.name,
        email: cleanEmail,
      },
    });
  } catch (err: any) {
    console.error('[POST /api/auth/forgot-password/reset-password]', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao redefinir a senha.' },
      { status: 500 }
    );
  }
}
