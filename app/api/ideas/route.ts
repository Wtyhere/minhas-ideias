import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/api-helpers';
import { INITIAL_IDEAS } from '@/lib/data';
import { Idea, Attachment } from '@/types/idea';
import { User } from '@/types/auth';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidUuid(val?: string | null): boolean {
  return (
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)
  );
}

async function getAuthenticatedUser(): Promise<User | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user: supaUser }, error } = await supabase.auth.getUser();

      if (!error && supaUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', supaUser.id)
          .maybeSingle();

        const cleanEmail = (supaUser.email || '').toLowerCase();
        const isAdmin =
          cleanEmail === 'admin@cm.com.br' ||
          cleanEmail === 'adrmin@cm.com.br' ||
          profile?.role === 'admin';

        return {
          id: supaUser.id,
          name:
            profile?.name ||
            supaUser.user_metadata?.name ||
            (cleanEmail === 'usuario@cm.com.br'
              ? 'Supermercado Parceiro CM'
              : cleanEmail.split('@')[0]),
          email: supaUser.email || cleanEmail,
          role: isAdmin ? 'admin' : 'user',
          status: (profile?.status as 'active' | 'inactive') || 'active',
          cnpj: profile?.cnpj || supaUser.user_metadata?.cnpj,
          unit: profile?.unit || supaUser.user_metadata?.unit,
          createdAt: profile?.created_at || supaUser.created_at,
          mustChangePassword: profile?.must_change_password ?? false,
        };
      }
    } catch (err) {
      console.error('[getAuthenticatedUser] Erro ao verificar sessão Supabase:', err);
    }
  }

  // Fallback para sessão baseada no cookie cm_session
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('cm_session');
    if (sessionCookie?.value) {
      return JSON.parse(sessionCookie.value) as User;
    }
  } catch {
    // ignorar
  }

  return null;
}

// ─── GET /api/ideas ──────────────────────────────────────────────────────────
// Retorna a lista de ideias cadastradas no Supabase (filtrável por status)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    const admin = createAdminClient();
    let query = admin
      .from('ideas')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusParam) {
      query = query.eq('status', statusParam);
    }

    const { data: dbIdeas, error } = await query;

    if (error) {
      // Se a tabela ainda não existir no Supabase, retorna o fallback com aviso
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('[GET /api/ideas] Tabela public.ideas não encontrada no Supabase.');
        return NextResponse.json({
          success: true,
          ideas: statusParam ? [] : INITIAL_IDEAS,
          tableMissing: true,
          warning: 'Tabela public.ideas não encontrada no Supabase. Execute o arquivo supabase/schema.sql no SQL Editor.'
        });
      }

      console.error('[GET /api/ideas] Erro ao buscar ideias no Supabase:', error);
      return NextResponse.json({ success: true, ideas: statusParam ? [] : INITIAL_IDEAS });
    }

    // Mapeia colunas do banco (snake_case) para a tipagem Idea (camelCase)
    const mappedIdeas: Idea[] = (dbIdeas || []).map((row) => ({
      id: row.id,
      title: row.title,
      product: 'Varejofacil',
      category: row.category,
      company: row.company,
      authorName: row.author_name,
      authorEmail: row.author_email,
      createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
      cycle: row.cycle,
      painDescription: row.pain_description,
      currentWorkaround: row.current_workaround,
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      status: row.status,
      deliveredBuild: row.delivered_build ?? undefined,
      mergedIntoId: row.merged_into_id ?? undefined,
      votes: (row.votes && typeof row.votes === 'object') ? row.votes : {},
      comments: Array.isArray(row.comments) ? row.comments : [],
      fromSupabase: true,
      userId: row.user_id ?? undefined,
    }));

    // Retorna apenas as ideias cadastradas no Supabase
    return NextResponse.json({ success: true, ideas: mappedIdeas });
  } catch (err: any) {
    console.error('[GET /api/ideas]', err);
    return NextResponse.json({ success: true, ideas: [] });
  }
}

// ─── POST /api/ideas ─────────────────────────────────────────────────────────
// Cadastra nova ideia no Supabase e faz upload de anexos para o storage
export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase não está configurado. Verifique o arquivo .env.local.' },
        { status: 503 }
      );
    }

    const sessionUser = await getAuthenticatedUser();
    const contentType = request.headers.get('content-type') || '';

    let title = '';
    let product: 'Varejofacil' = 'Varejofacil';
    let category = 'Estoque';
    let painDescription = '';
    let currentWorkaround = '';
    let cycle = 'Ciclo 2027';
    let clientAuthorName = '';
    let clientAuthorEmail = '';
    let clientCompany = '';
    let clientUserId = '';
    let attachments: Attachment[] = [];

    const admin = createAdminClient();

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = (formData.get('title') as string) || '';
      product = 'Varejofacil';
      category = (formData.get('category') as string) || 'Estoque';
      painDescription = (formData.get('painDescription') as string) || '';
      currentWorkaround = (formData.get('currentWorkaround') as string) || '';
      cycle = (formData.get('cycle') as string) || 'Ciclo 2027';

      clientAuthorName = (formData.get('authorName') as string) || '';
      clientAuthorEmail = (formData.get('authorEmail') as string) || '';
      clientCompany = (formData.get('company') as string) || '';
      clientUserId = (formData.get('userId') as string) || '';

      const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
      const ALLOWED_EXTENSIONS = ['.xlsx', '.csv', '.pdf', '.png', '.jpg', '.jpeg'];

      // Upload de múltiplos arquivos para o Supabase Storage (bucket 'files')
      const uploadedFiles = formData.getAll('files') as File[];
      for (const file of uploadedFiles) {
        if (!file || typeof file === 'string' || file.size === 0) continue;

        const dotIdx = file.name.lastIndexOf('.');
        const fileExt = dotIdx !== -1 ? file.name.slice(dotIdx).toLowerCase() : '';
        if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
          return NextResponse.json(
            {
              success: false,
              error: `O arquivo "${file.name}" possui formato inválido. Formatos permitidos: .xlsx, .csv, .pdf, .png, .jpg.`,
            },
            { status: 400 }
          );
        }

        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            {
              success: false,
              error: `O arquivo "${file.name}" excede o tamanho máximo permitido de 2MB.`,
            },
            { status: 400 }
          );
        }

        try {
          const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filePath = `ideas/${Date.now()}_${cleanName}`;
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const { error: uploadError } = await admin.storage
            .from('files')
            .upload(filePath, buffer, {
              contentType: file.type || 'application/octet-stream',
              upsert: false,
            });

          let fileUrl: string | undefined = undefined;
          if (!uploadError) {
            const { data: publicUrlData } = admin.storage.from('files').getPublicUrl(filePath);
            fileUrl = publicUrlData?.publicUrl;
          } else {
            console.warn(`[POST /api/ideas] Aviso ao enviar anexo ${file.name}:`, uploadError.message);
          }

          attachments.push({
            name: file.name,
            size: formatFileSize(file.size),
            url: fileUrl,
          });
        } catch (fileErr) {
          console.error(`[POST /api/ideas] Falha no processamento do arquivo ${file.name}:`, fileErr);
          attachments.push({
            name: file.name,
            size: formatFileSize(file.size),
          });
        }
      }
    } else {
      const body = await request.json();
      title = body.title || '';
      product = body.product || 'Varejofacil';
      category = body.category || 'Estoque';
      painDescription = body.painDescription || '';
      currentWorkaround = body.currentWorkaround || '';
      cycle = body.cycle || 'Ciclo 2026.2';
      clientAuthorName = body.authorName || '';
      clientAuthorEmail = body.authorEmail || '';
      clientCompany = body.company || '';
      clientUserId = body.userId || '';
      attachments = Array.isArray(body.attachments) ? body.attachments : [];

      const ALLOWED_EXTENSIONS = ['.xlsx', '.csv', '.pdf', '.png', '.jpg', '.jpeg'];
      for (const att of attachments) {
        if (att.name) {
          const dotIdx = att.name.lastIndexOf('.');
          const fileExt = dotIdx !== -1 ? att.name.slice(dotIdx).toLowerCase() : '';
          if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
            return NextResponse.json(
              {
                success: false,
                error: `O anexo "${att.name}" possui formato não permitido. Formatos aceitos: .xlsx, .csv, .pdf, .png, .jpg.`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // Regra: Somente permitido submeter ideias para o Varejofacil
    if (product !== 'Varejofacil') {
      return NextResponse.json(
        {
          success: false,
          error: 'No momento, o cadastro de novas ideias é exclusivamente para o Varejofacil.',
        },
        { status: 400 }
      );
    }

    // Validação de preenchimento dos campos essenciais
    if (!title.trim() || !painDescription.trim() || !currentWorkaround.trim()) {
      return NextResponse.json(
        { success: false, error: 'Por favor, preencha todos os campos obrigatórios (Título, Gargalo e Contorno).' },
        { status: 400 }
      );
    }

    // Identificação do autor (prioriza sessão ativa do servidor, com fallback para dados enviados pelo client)
    const authorName = sessionUser?.name || clientAuthorName || 'Supermercado Parceiro';
    const authorEmail = sessionUser?.email || clientAuthorEmail || 'usuario@cm.com.br';
    const company = sessionUser?.unit || clientCompany || 'Supermercado Varejista';
    const rawUserId = sessionUser?.id || clientUserId || null;

    // Resolução segura de user_id:
    // A coluna user_id na tabela ideas referencia auth.users(id) (tipo UUID).
    // Se o usuário não for um UUID válido ou não existir em auth.users, enviamos null para evitar erro de Foreign Key.
    let validUserId: string | null = null;

    if (isValidUuid(rawUserId)) {
      const { data: authUser } = await admin.auth.admin.getUserById(rawUserId!);
      if (authUser?.user) {
        validUserId = rawUserId;
      }
    }

    // Se ainda não temos um UUID válido, tenta localizar o usuário pelo e-mail em profiles
    if (!validUserId && authorEmail) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('email', authorEmail.trim().toLowerCase())
        .maybeSingle();

      if (profile?.id && isValidUuid(profile.id)) {
        validUserId = profile.id;
      }
    }

    // Inserção na tabela public.ideas do Supabase
    let insertPayload = {
      user_id: validUserId,
      title: title.trim(),
      product,
      category,
      company,
      author_name: authorName,
      author_email: authorEmail,
      cycle,
      pain_description: painDescription.trim(),
      current_workaround: currentWorkaround.trim(),
      attachments,
      status: 'pending_review',
      votes: {},
      comments: [],
    };

    let { data: insertedIdea, error: insertError } = await admin
      .from('ideas')
      .insert(insertPayload)
      .select()
      .single();

    // Fallback: caso dê erro de violação de FK no user_id (código 23503), retenta com user_id = null
    if (insertError && insertError.code === '23503') {
      console.warn('[POST /api/ideas] user_id não encontrado em auth.users. Salvando com user_id = null.');
      const retryResult = await admin
        .from('ideas')
        .insert({ ...insertPayload, user_id: null })
        .select()
        .single();

      insertedIdea = retryResult.data;
      insertError = retryResult.error;
    }

    if (insertError) {
      console.error('[POST /api/ideas] Erro ao inserir no Supabase:', insertError);

      if (insertError.code === 'PGRST205' || insertError.message?.includes('Could not find the table')) {
        return NextResponse.json(
          {
            success: false,
            tableMissing: true,
            error:
              'A tabela "ideas" ainda não foi criada no Supabase. Por favor, execute o script SQL em "supabase/schema.sql" no SQL Editor do seu projeto Supabase.',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: false, error: `Erro ao salvar ideia no Supabase: ${insertError.message}` },
        { status: 500 }
      );
    }

    const createdIdea: Idea = {
      id: insertedIdea.id,
      title: insertedIdea.title,
      product: insertedIdea.product,
      category: insertedIdea.category,
      company: insertedIdea.company,
      authorName: insertedIdea.author_name,
      authorEmail: insertedIdea.author_email,
      createdAt: insertedIdea.created_at
        ? new Date(insertedIdea.created_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      cycle: insertedIdea.cycle,
      painDescription: insertedIdea.pain_description,
      currentWorkaround: insertedIdea.current_workaround,
      attachments: insertedIdea.attachments || [],
      status: insertedIdea.status,
      votes: insertedIdea.votes || {},
      comments: insertedIdea.comments || [],
      fromSupabase: true,
      userId: insertedIdea.user_id ?? undefined,
    };

    console.log('[POST /api/ideas] Ideia cadastrada com sucesso no Supabase:', createdIdea.id);
    return NextResponse.json({ success: true, idea: createdIdea }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/ideas] Erro inesperado:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Erro interno ao cadastrar a ideia.' },
      { status: 500 }
    );
  }
}
