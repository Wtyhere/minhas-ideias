import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { User } from '@/types/auth';
import { isSupabaseConfigured, requireAdmin } from '@/lib/api-helpers';
import { isValidCnpj, normalizeCnpj } from '@/lib/validation';

// ─── PATCH /api/users/[id] ───────────────────────────────────────────────────
// Atualiza dados cadastrais do perfil (nome, cnpj, unit, role, status)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase não configurado.' },
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
    const { name, cnpj, unit, role, status } = body;

    if (!name?.trim() || !cnpj?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nome e CNPJ são obrigatórios.' },
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

    // Verifica se existirá duplicidade de CNPJ ativo ao editar
    const cleanCnpjDigits = normalizeCnpj(cnpj);
    const ALLOWED_DUPLICATE_CNPJ = '07128945000132';

    if (cleanCnpjDigits !== ALLOWED_DUPLICATE_CNPJ && status === 'active') {
      const { data: allProfiles } = await admin
        .from('profiles')
        .select('id, cnpj, status');

      const activeCnpjExists = allProfiles?.some(
        (p) => p.id !== id && p.cnpj && normalizeCnpj(p.cnpj) === cleanCnpjDigits && p.status === 'active'
      );

      if (activeCnpjExists) {
        return NextResponse.json(
          { success: false, error: 'Já existe um usuário ativo cadastrado com este CNPJ.' },
          { status: 409 }
        );
      }
    }

    // Atualiza perfil na tabela profiles
    const { data: updated, error: profileError } = await admin
      .from('profiles')
      .update({
        name: name.trim(),
        cnpj: cnpj.trim(),
        unit: unit?.trim() || null,
        role: role || 'user',
        status: status || 'active',
      })
      .eq('id', id)
      .select()
      .single();

    if (profileError) {
      console.error('[PATCH /api/users/[id]]', profileError);
      return NextResponse.json(
        { success: false, error: profileError.message },
        { status: 500 }
      );
    }

    // Atualiza role no Supabase Auth user_metadata também
    await admin.auth.admin.updateUserById(id, {
      user_metadata: {
        name: name.trim(),
        cnpj: cnpj.trim(),
        unit: unit?.trim() || '',
        role: role || 'user',
      },
    });

    const user: User = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role as 'admin' | 'user',
      status: updated.status as 'active' | 'inactive',
      cnpj: updated.cnpj ?? undefined,
      unit: updated.unit ?? undefined,
      createdAt: updated.created_at,
      mustChangePassword: updated.must_change_password ?? false,
    };

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error('[PATCH /api/users/[id]]', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao atualizar usuário.' },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/users/[id] ──────────────────────────────────────────────────
// Remove usuário do Supabase Auth (cascade deleta o profile via FK)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase não configurado.' },
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

    // Impede que o admin delete a si mesmo
    if (authResult.supaUser.id === id) {
      return NextResponse.json(
        { success: false, error: 'Não é possível deletar o próprio usuário conectado.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/users/[id]]', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao remover usuário.' },
      { status: 500 }
    );
  }
}
