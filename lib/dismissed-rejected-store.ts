import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Gerenciador server-side de ideias recusadas que foram dispensadas/fechadas pelo usuário.
 * Mantém persistência tanto no Supabase Auth (user_metadata) quanto em memória global singleton,
 * garantindo que a supressão do alerta funcione entre diferentes navegadores e dispositivos.
 */

declare global {
  // eslint-disable-next-line no-var
  var __cm_dismissed_rejected_store: Map<string, Set<string>> | undefined;
}

const dismissedStore: Map<string, Set<string>> =
  globalThis.__cm_dismissed_rejected_store ?? new Map<string, Set<string>>();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__cm_dismissed_rejected_store = dismissedStore;
}

/**
 * Retorna os IDs de ideias recusadas dispensadas para um determinado e-mail no store em memória.
 */
export function getDismissedRejectedFromStore(email?: string | null): string[] {
  if (!email) return [];
  const cleanEmail = email.trim().toLowerCase();
  const set = dismissedStore.get(cleanEmail);
  return set ? Array.from(set) : [];
}

/**
 * Salva no store em memória os IDs informados para o e-mail informado.
 */
export function saveDismissedRejectedToStore(email: string, ideaIds: string[]): string[] {
  const cleanEmail = email.trim().toLowerCase();
  let set = dismissedStore.get(cleanEmail);
  if (!set) {
    set = new Set<string>();
    dismissedStore.set(cleanEmail, set);
  }
  for (const id of ideaIds) {
    if (id) set.add(id);
  }
  return Array.from(set);
}

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

/**
 * Sincroniza os IDs de ideias dispensadas com o user_metadata do Supabase Auth e o store local.
 * Retorna a lista unificada de IDs dispensados.
 */
export async function syncUserDismissedRejected(
  userId: string | null | undefined,
  email: string | null | undefined,
  ideaIdsToDismiss: string[]
): Promise<string[]> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!ideaIdsToDismiss.length) {
    return cleanEmail ? getDismissedRejectedFromStore(cleanEmail) : [];
  }

  // 1. Salva no store em memória
  if (cleanEmail) {
    saveDismissedRejectedToStore(cleanEmail, ideaIdsToDismiss);
  }

  // 2. Se o Supabase Admin estiver configurado, persiste no user_metadata do Supabase Auth
  if (isSupabaseAdminConfigured()) {
    try {
      const admin = createAdminClient();
      let targetUser = null;

      if (userId) {
        const { data } = await admin.auth.admin.getUserById(userId);
        targetUser = data?.user || null;
      }

      if (!targetUser && cleanEmail) {
        const { data: listData } = await admin.auth.admin.listUsers();
        targetUser =
          listData?.users?.find(
            (u) => (u.email || '').toLowerCase() === cleanEmail
          ) || null;
      }

      if (targetUser) {
        const existing: string[] = Array.isArray(
          targetUser.user_metadata?.dismissed_rejected_idea_ids
        )
          ? targetUser.user_metadata.dismissed_rejected_idea_ids
          : [];

        const merged = Array.from(
          new Set([...existing, ...ideaIdsToDismiss, ...getDismissedRejectedFromStore(cleanEmail)])
        );

        await admin.auth.admin.updateUserById(targetUser.id, {
          user_metadata: {
            ...targetUser.user_metadata,
            dismissed_rejected_idea_ids: merged,
          },
        });

        if (cleanEmail) {
          saveDismissedRejectedToStore(cleanEmail, merged);
        }

        return merged;
      }
    } catch (err) {
      console.warn('[syncUserDismissedRejected] Erro ao sincronizar com Supabase Auth:', err);
    }
  }

  return cleanEmail ? getDismissedRejectedFromStore(cleanEmail) : ideaIdsToDismiss;
}
