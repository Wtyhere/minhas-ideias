import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { INITIAL_USERS } from '@/lib/auth';
import { User } from '@/types/auth';
import { isSupabaseConfigured, requireAdmin } from '@/lib/api-helpers';
import { isValidCnpj, normalizeCnpj } from '@/lib/validation';

// ─── GET /api/users ──────────────────────────────────────────────────────────
// Lista todos os usuários da tabela profiles (apenas admins)
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, users: INITIAL_USERS });
    }

    const authResult = await requireAdmin();
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const admin = createAdminClient();
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }


    const users: User[] = (profiles || []).map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role as 'admin' | 'user',
      status: p.status as 'active' | 'inactive',
      cnpj: p.cnpj ?? undefined,
      unit: p.unit ?? undefined,
      createdAt: p.created_at,
      mustChangePassword: p.must_change_password
    }));

    return NextResponse.json({ success: true, users });
  } catch (err) {
    console.error('[GET /api/users]', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao listar usuários.' },
      { status: 500 }
    );
  }
}

// ─── POST /api/users ─────────────────────────────────────────────────────────
// Cria novo usuário no Supabase Auth + perfil na tabela profiles (apenas admins)
export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase não configurado. Configure o .env.local.' },
        { status: 503 }
      );
    }

    const authResult = await requireAdmin();
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { name, email, cnpj, unit, role, status, password='1234' } = body;

    const cleanEmail = (email || '').trim().toLowerCase();

    if (!name?.trim() || !cleanEmail || !cnpj?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nome, e-mail e CNPJ são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!isValidCnpj(cnpj)) {
      return NextResponse.json(
        { success: false, error: 'CNPJ inválido. Por favor, forneça um CNPJ válido.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verifica duplicidade de e-mail antes de tentar criar
    const { data: existingEmail } = await admin
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'Já existe um usuário cadastrado com este e-mail.' },
        { status: 409 }
      );
    }

    // Verifica duplicidade de CNPJ (se existir pelo menos um usuário ativo com este CNPJ, barra o cadastro)
    // O único CNPJ que pode possuir múltiplos cadastros é 07128945000132
    const cleanCnpjDigits = normalizeCnpj(cnpj);
    const ALLOWED_DUPLICATE_CNPJ = '07128945000132';

    if (cleanCnpjDigits !== ALLOWED_DUPLICATE_CNPJ) {
      const { data: allProfiles } = await admin
        .from('profiles')
        .select('id, cnpj, status');

      const activeCnpjExists = allProfiles?.some(
        (p) => p.cnpj && normalizeCnpj(p.cnpj) === cleanCnpjDigits && p.status === 'active'
      );

      if (activeCnpjExists) {
        return NextResponse.json(
          { success: false, error: 'Já existe um usuário ativo cadastrado com este CNPJ.' },
          { status: 409 }
        );
      }
    }

    // Senha temporária: se não informada, gera uma aleatória
    const tempPassword =
      password?.trim() ||
      Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-4).toUpperCase() + '!';

    // Cria usuário no Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true, // confirma e-mail automaticamente
      user_metadata: {
        name: name.trim(),
        cnpj: cnpj.trim(),
        unit: unit?.trim() || '',
        role: role || 'user',
        status: status || 'active',
        must_change_password: true,
      },
    });

    if (authError || !authData.user) {
      console.error('[POST /api/users] auth.admin.createUser:', authError);
      return NextResponse.json(
        { success: false, error: authError?.message || 'Erro ao criar usuário no Supabase Auth.' },
        { status: 500 }
      );
    }

    // O trigger on_auth_user_created já cria o perfil automaticamente.
    // Mas fazemos upsert para garantir consistência caso o trigger falhe.
    const { error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        name: name.trim(),
        email: cleanEmail,
        cnpj: cnpj.trim(),
        unit: unit?.trim() || null,
        role: role || 'user',
        status: status || 'active',
        must_change_password: true,
      });

    if (profileError) {
      console.error('[POST /api/users] profiles upsert:', profileError);
      // Usuário já foi criado no Auth — retorna aviso mas não falha
    }

    const newUser: User = {
      id: authData.user.id,
      name: name.trim(),
      email: cleanEmail,
      cnpj: cnpj.trim(),
      unit: unit?.trim() || undefined,
      role: (role as 'admin' | 'user') || 'user',
      status: (status as 'active' | 'inactive') || 'active',
      createdAt: authData.user.created_at,
      mustChangePassword: true
    };

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/users]', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao criar usuário.' },
      { status: 500 }
    );
  }
}
