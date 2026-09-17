import { NextResponse } from 'next/server';
import { verifyResetCode } from '@/lib/password-reset-store';
import { isSupabaseConfigured } from '@/lib/api-helpers';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body as { email?: string; code?: string };

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'E-mail não informado.' },
        { status: 400 }
      );
    }

    if (!cleanCode) {
      return NextResponse.json(
        { success: false, error: 'Por favor, informe o código de verificação de 6 dígitos.' },
        { status: 400 }
      );
    }

    let isValid = false;

    // 1. Tenta validar diretamente via Supabase verifyOtp se configurado
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createSupabaseServerClient();
        const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: 'recovery',
        });
        if (!otpError && otpData.user) {
          isValid = true;
        }
      } catch (e) {
        console.warn('[verify-code] Erro verifyOtp:', e);
      }
    }

    // 2. Se não validou no Supabase, tenta validar via repositório de fallback local
    if (!isValid) {
      const verification = verifyResetCode(cleanEmail, cleanCode);
      if (verification.valid) {
        isValid = true;
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Código de verificação incorreto ou expirado. Verifique os números digitados.' },
        { status: 400 }
      );
    }

    const { markCodeAsVerified } = await import('@/lib/password-reset-store');
    markCodeAsVerified(cleanEmail);

    return NextResponse.json({
      success: true,
      message: 'Código de verificação validado com sucesso.',
    });
  } catch (err: any) {
    console.error('[POST /api/auth/forgot-password/verify-code]', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao validar código de verificação.' },
      { status: 500 }
    );
  }
}
