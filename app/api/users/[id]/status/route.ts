import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured, requireAdmin } from '@/lib/api-helpers';
import { normalizeCnpj } from '@/lib/validation';

// ─── PATCH /api/users/[id]/status ────────────────────────────────────────────
// Alterna o status do usuário entre 'active' e 'inactive'
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

    // Impede que o admin inative a si mesmo
    if (authResult.supaUser.id === id) {
      return NextResponse.json(
        { success: false, error: 'Não é permitido inativar seu próprio usuário conectado!' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body as { status: 'active' | 'inactive' };

    if (status !== 'active' && status !== 'inactive') {
      return NextResponse.json(
        { success: false, error: 'Status inválido. Use "active" ou "inactive".' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Se estiver ativando, valida se já não existe outro usuário ativo com o mesmo CNPJ
    if (status === 'active') {
      const { data: currentProfile } = await admin
        .from('profiles')
        .select('cnpj')
        .eq('id', id)
        .maybeSingle();

      if (currentProfile?.cnpj) {
        const cleanCnpjDigits = normalizeCnpj(currentProfile.cnpj);
        const ALLOWED_DUPLICATE_CNPJ = '07128945000132';

        if (cleanCnpjDigits !== ALLOWED_DUPLICATE_CNPJ) {
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
      }
    }

    const { data: updated, error } = await admin
      .from('profiles')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: updated.status });
  } catch (err) {
    console.error('[PATCH /api/users/[id]/status]', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao atualizar status.' },
      { status: 500 }
    );
  }
}
