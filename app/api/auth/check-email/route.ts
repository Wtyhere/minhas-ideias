import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { INITIAL_USERS } from '@/lib/auth';

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
    const { email } = body;

    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'Por favor, insira o seu e-mail.' },
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

    // Se o Supabase estiver configurado com service role
    if (isSupabaseAdminConfigured()) {
      const admin = createAdminClient();

      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('id, name, email, status, must_change_password, role')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profileError) {
        console.error('[POST /api/auth/check-email] erro ao buscar perfil:', profileError);
      }

      if (!profile) {
        return NextResponse.json(
          { success: false, error: 'E-mail não encontrado no sistema.' },
          { status: 404 }
        );
      }

      if (profile.status === 'inactive') {
        return NextResponse.json(
          { success: false, error: 'Acesso bloqueado: Este usuário está Inativo.' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        email: cleanEmail,
        name: profile.name,
        mustChangePassword: Boolean(profile.must_change_password),
      });
    }

    // Fallback de desenvolvimento (Mock)
    const registeredUser = INITIAL_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (registeredUser) {
      if (registeredUser.status === 'inactive') {
        return NextResponse.json(
          { success: false, error: 'Acesso bloqueado: Este usuário está Inativo.' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        email: cleanEmail,
        name: registeredUser.name,
        mustChangePassword: Boolean(registeredUser.mustChangePassword),
      });
    }

    // Tratativa para administrador padrão no ambiente mock
    if (cleanEmail === 'admin@cm.com.br' || cleanEmail === 'adrmin@cm.com.br') {
      return NextResponse.json({
        success: true,
        email: cleanEmail,
        name: 'Administrador Casa Magalhães',
        mustChangePassword: false,
      });
    }

    return NextResponse.json(
      { success: false, error: 'E-mail não cadastrado no sistema.' },
      { status: 404 }
    );
  } catch (err: unknown) {
    console.error('[POST /api/auth/check-email]', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao verificar e-mail.' },
      { status: 500 }
    );
  }
}
