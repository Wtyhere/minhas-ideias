import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { INITIAL_USERS } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/api-helpers';
import { storeResetCode } from '@/lib/password-reset-store';
import { sendPasswordResetEmail } from '@/lib/mailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'Por favor, informe seu e-mail cadastrado.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: 'Formato de e-mail inválido.' },
        { status: 400 }
      );
    }

    let userName = '';
    let userExists = false;

    // 1. Verificação no Supabase se configurado
    if (isSupabaseConfigured()) {
      const admin = createAdminClient();

      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('id, name, email, status')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profileError) {
        console.error('[send-code] Erro ao consultar perfil:', profileError);
      }

      if (profile) {
        userExists = true;
        userName = profile.name || '';

        if (profile.status === 'inactive') {
          return NextResponse.json(
            { success: false, error: 'Acesso bloqueado: Este usuário está inativo no sistema.' },
            { status: 403 }
          );
        }
      }

      // Se não achou na tabela profiles, verifica se existe usuário no Supabase Auth
      if (!userExists) {
        try {
          const { data: authUsers } = await admin.auth.admin.listUsers();
          const found = authUsers?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (found) {
            userExists = true;
            userName = found.user_metadata?.name || '';
          }
        } catch (e) {
          console.warn('[send-code] Erro ao listar auth users:', e);
        }
      }

      if (!userExists) {
        return NextResponse.json(
          { success: false, error: 'E-mail não localizado em nossa base cadastral. Verifique a digitação ou contate o administrador.' },
          { status: 404 }
        );
      }

      // 1. Dispara o envio do e-mail de recuperação diretamente pelo Supabase Auth
      let supabaseSendError: string | null = null;
      try {
        const supabase = await createSupabaseServerClient();
        const { error: resetEmailError } = await supabase.auth.resetPasswordForEmail(cleanEmail);
        if (resetEmailError) {
          console.warn('[send-code] Supabase resetPasswordForEmail warning:', resetEmailError.message);
          if ((resetEmailError as any).status === 429) {
            return NextResponse.json(
              { success: false, error: 'Aguarde alguns instantes antes de solicitar um novo código.' },
              { status: 429 }
            );
          }
          supabaseSendError = resetEmailError.message;
        }
      } catch (err: any) {
        console.warn('[send-code] Erro resetPasswordForEmail:', err);
        supabaseSendError = err.message || 'Erro ao conectar ao serviço de e-mail do Supabase.';
      }

      // 2. Gera OTP / link de recuperação pelo Supabase Admin para registro e validação resiliente
      let generatedOtp: string | undefined;
      try {
        const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email: cleanEmail,
        });

        if (linkError) {
          console.warn('[send-code] Aviso ao gerar link recovery Supabase:', linkError.message);
        } else if (linkData?.properties?.email_otp) {
          generatedOtp = linkData.properties.email_otp.trim();
        }
      } catch (err) {
        console.warn('[send-code] Erro generateLink:', err);
      }

      // 3. Registra código no repositório de redefinição
      const storeResult = storeResetCode(cleanEmail, generatedOtp);
      if (!storeResult.success) {
        return NextResponse.json(
          { success: false, error: storeResult.error },
          { status: 429 }
        );
      }

      const finalCode = storeResult.code;

      return NextResponse.json({
        success: true,
        message: 'Código de recuperação enviado para o seu e-mail.',
        email: cleanEmail,
        name: userName || undefined,
        debugCode: finalCode,
      });
    }

    // 2. Fallback de desenvolvimento (Mock)
    const mockUser = INITIAL_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    const isAdmin =
      cleanEmail === 'admin@cm.com.br' || cleanEmail === 'adrmin@cm.com.br';

    if (!mockUser && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'E-mail não localizado em nossa base cadastral. Verifique a digitação ou contate o administrador.' },
        { status: 404 }
      );
    }

    if (mockUser && mockUser.status === 'inactive') {
      return NextResponse.json(
        { success: false, error: 'Acesso bloqueado: Este usuário está inativo no sistema.' },
        { status: 403 }
      );
    }

    userName = mockUser?.name || 'Administrador Casa Magalhães';

    const storeResult = storeResetCode(cleanEmail);
    if (!storeResult.success) {
      return NextResponse.json(
        { success: false, error: storeResult.error },
        { status: 429 }
      );
    }

    const finalCode = storeResult.code;

    const mailResult = await sendPasswordResetEmail({
      to: cleanEmail,
      name: userName,
      code: finalCode,
    });

    return NextResponse.json({
      success: true,
      message: 'Código de recuperação enviado para o seu e-mail.',
      email: cleanEmail,
      name: userName || undefined,
      debugCode: finalCode,
    });
  } catch (err: any) {
    console.error('[POST /api/auth/forgot-password/send-code]', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar código de recuperação.' },
      { status: 500 }
    );
  }
}
