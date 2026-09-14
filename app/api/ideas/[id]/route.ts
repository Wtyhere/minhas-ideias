import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/api-helpers';
import { IdeaStatus } from '@/types/idea';

// ─── PATCH /api/ideas/[id] ───────────────────────────────────────────────────
// Atualiza o status de uma ideia (ex: aprovar para 'voting', recusar para 'rejected', etc.)
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

    const body = await request.json();
    const {
      status,
      deliveredBuild,
      mergedIntoId,
      votes,
      comments,
      title,
      category,
      painDescription,
      currentWorkaround,
      attachments,
      rejectionReason,
    } = body as {
      status?: IdeaStatus;
      deliveredBuild?: string;
      mergedIntoId?: string;
      votes?: Record<string, number>;
      comments?: any[];
      title?: string;
      category?: string;
      painDescription?: string;
      currentWorkaround?: string;
      attachments?: any[];
      rejectionReason?: string;
    };

    if (status === 'rejected') {
      const reason = rejectionReason?.trim();
      const hasRejectionComment =
        Boolean(reason) ||
        (Array.isArray(comments) &&
          comments.some((c) => c.text && c.text.includes('[Motivo da Recusa]')));

      if (!hasRejectionComment) {
        return NextResponse.json(
          {
            success: false,
            error: 'O comentário com a justificativa da recusa é obrigatório ao recusar uma ideia.',
          },
          { status: 400 }
        );
      }
    }

    const updatePayload: Record<string, any> = {};

    if (status) {
      const validStatuses: IdeaStatus[] = [
        'pending_review',
        'voting',
        'in_immersion',
        'in_development',
        'in_validation',
        'in_pilot',
        'delivered',
        'merged',
        'rejected',
      ];

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Status "${status}" é inválido.` },
          { status: 400 }
        );
      }

      updatePayload.status = status;
    }

    if (deliveredBuild !== undefined) {
      updatePayload.delivered_build = deliveredBuild;
    }

    if (mergedIntoId !== undefined) {
      updatePayload.merged_into_id = mergedIntoId;
    }

    if (comments !== undefined) {
      if (!Array.isArray(comments)) {
        return NextResponse.json(
          { success: false, error: 'Lista de comentários inválida.' },
          { status: 400 }
        );
      }

      const admin = createAdminClient();
      const { data: existingIdea } = await admin
        .from('ideas')
        .select('author_email, comments')
        .eq('id', id)
        .maybeSingle();

      if (existingIdea?.author_email) {
        const authorEmailLower = existingIdea.author_email.trim().toLowerCase();
        const existingComments = Array.isArray(existingIdea.comments) ? existingIdea.comments : [];
        const existingCommentIds = new Set(existingComments.map((c: any) => c.id));

        const newComments = comments.filter((c: any) => !existingCommentIds.has(c.id));
        for (const newComm of newComments) {
          const commEmail = (newComm.userEmail || '').trim().toLowerCase();
          const isRejectionOrSystem =
            (newComm.text || '').includes('[Motivo da Recusa]') ||
            (newComm.text || '').includes('[Demanda Agrupada]');

          if (!isRejectionOrSystem && commEmail && commEmail === authorEmailLower) {
            return NextResponse.json(
              {
                success: false,
                error: 'O usuário que criou a ideia não pode comentar na própria demanda.',
              },
              { status: 403 }
            );
          }
        }
      }

      updatePayload.comments = comments;
    }

    if (title !== undefined) {
      updatePayload.title = title.trim();
    }

    if (category !== undefined) {
      updatePayload.category = category;
    }

    if (painDescription !== undefined) {
      updatePayload.pain_description = painDescription.trim();
    }

    if (currentWorkaround !== undefined) {
      updatePayload.current_workaround = currentWorkaround.trim();
    }

    if (attachments !== undefined) {
      updatePayload.attachments = attachments;
    }

    if (votes !== undefined && typeof votes === 'object') {
      const admin = createAdminClient();
      const { data: existingIdea } = await admin
        .from('ideas')
        .select('author_email')
        .eq('id', id)
        .maybeSingle();

      const sanitizedVotes: Record<string, number> = { ...votes };

      // Garante que o autor da ideia não consiga votar nela
      if (existingIdea?.author_email) {
        const authorEmailLower = existingIdea.author_email.trim().toLowerCase();
        for (const voterEmail of Object.keys(sanitizedVotes)) {
          if (voterEmail.trim().toLowerCase() === authorEmailLower) {
            delete sanitizedVotes[voterEmail];
          }
        }
      }

      updatePayload.votes = sanitizedVotes;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo informado para atualização.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: updated, error } = await admin
      .from('ideas')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[PATCH /api/ideas/${id}] Erro ao atualizar:`, error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, idea: updated });
  } catch (err: any) {
    console.error('[PATCH /api/ideas/[id]] Erro inesperado:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro interno ao atualizar ideia.' },
      { status: 500 }
    );
  }
}
