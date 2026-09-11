import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { authenticateUser } from '@/lib/auth';
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
    const { email, password } = body;

    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'Por favor, insira o seu e-mail corporativo.' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Por favor, insira sua senha de acesso.' },
        { status: 400 }
      );
    }

    // Integração direta com Supabase se configurado
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        let errorMsg = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMsg = 'Credenciais inválidas: e-mail ou senha incorretos.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMsg = 'E-mail não confirmado. Verifique sua caixa de entrada.';
        }
        return NextResponse.json(
          { success: false, error: errorMsg },
          { status: 401 }
        );
      }

      if (!data.user) {
        return NextResponse.json(
          { success: false, error: 'Usuário não localizado no Supabase.' },
          { status: 404 }
        );
      }

      // Buscar perfil na tabela 'profiles' do Supabase
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      // Verificar se o usuário está inativo no banco
      if (profile && profile.status === 'inactive') {
        await supabase.auth.signOut();
        return NextResponse.json(
          { success: false, error: 'Acesso bloqueado: Este usuário está marcado como Inativo.' },
          { status: 403 }
        );
      }

      const isAdmin =
        cleanEmail === 'admin@cm.com.br' ||
        cleanEmail === 'adrmin@cm.com.br' ||
        profile?.role === 'admin';

      const userObj: User = {
        id: data.user.id,
        name:
          profile?.name ||
          data.user.user_metadata?.name ||
          (cleanEmail === 'usuario@cm.com.br'
            ? 'Supermercado Parceiro CM'
            : cleanEmail.split('@')[0]),
        email: data.user.email || cleanEmail,
        role: isAdmin ? 'admin' : 'user',
        status: (profile?.status as 'active' | 'inactive') || 'active',
        cnpj:
          profile?.cnpj ||
          data.user.user_metadata?.cnpj ||
          (isAdmin ? '03.882.112/0001-40' : '07.123.456/0001-89'),
        unit:
          profile?.unit ||
          data.user.user_metadata?.unit ||
          (isAdmin ? 'P&D Casa Magalhães' : 'Loja Matriz - Supermercado Modelo'),
        createdAt:
          profile?.created_at ||
          data.user.created_at ||
          new Date().toISOString().split('T')[0],
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
        user: userObj,
      });
    }

    // Fallback de desenvolvimento caso o .env.local ainda não tenha sido preenchido
    const result = authenticateUser(cleanEmail, password);

    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error || 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set('cm_session', JSON.stringify(result.user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (err) {
    console.error('Erro na autenticação Supabase:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar autenticação com Supabase.' },
      { status: 500 }
    );
  }
}
