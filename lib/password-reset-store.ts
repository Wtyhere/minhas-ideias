/**
 * Gerenciador em memória (global singleton) para armazenar códigos de recuperação de senha.
 * Permite validação resiliente tanto com Supabase quanto em ambiente de desenvolvimento local.
 */

interface ResetRecord {
  email: string;
  code: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
  verified?: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __cm_password_resets: Map<string, ResetRecord> | undefined;
}

const resetMap: Map<string, ResetRecord> =
  globalThis.__cm_password_resets ?? new Map<string, ResetRecord>();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__cm_password_resets = resetMap;
}

const CODE_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutos
const MIN_RESEND_INTERVAL_MS = 30 * 1000; // 30 segundos entre reenvios
const MAX_ATTEMPTS = 5;

/**
 * Gera ou registra um código de verificação para o e-mail informado.
 */
export function storeResetCode(
  email: string,
  customCode?: string
): { success: boolean; code: string; error?: string; remainingSeconds?: number } {
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();

  const existing = resetMap.get(cleanEmail);
  if (existing && now - existing.lastSentAt < MIN_RESEND_INTERVAL_MS) {
    const remainingSeconds = Math.ceil((MIN_RESEND_INTERVAL_MS - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      code: existing.code,
      error: `Aguarde ${remainingSeconds} segundos antes de solicitar um novo código.`,
      remainingSeconds,
    };
  }

  // Garante sempre código numérico de exatamente 6 dígitos
  let code: string;
  if (customCode && /^\d{6}$/.test(customCode.trim())) {
    code = customCode.trim();
  } else if (customCode && /^\d+$/.test(customCode.trim()) && customCode.trim().length >= 6) {
    code = customCode.trim().slice(0, 6);
  } else {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  }

  resetMap.set(cleanEmail, {
    email: cleanEmail,
    code,
    expiresAt: now + CODE_EXPIRATION_MS,
    lastSentAt: now,
    attempts: 0,
    verified: false,
  });

  return {
    success: true,
    code,
  };
}

/**
 * Valida o código de verificação para o e-mail informado.
 */
export function verifyResetCode(
  email: string,
  inputCode: string
): { valid: boolean; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = (inputCode || '').trim();
  const now = Date.now();

  const record = resetMap.get(cleanEmail);

  if (!record) {
    return {
      valid: false,
      error: 'Nenhum código de recuperação foi solicitado para este e-mail ou ele já expirou.',
    };
  }

  if (now > record.expiresAt) {
    resetMap.delete(cleanEmail);
    return {
      valid: false,
      error: 'O código de verificação expirou. Por favor, solicite um novo código.',
    };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    resetMap.delete(cleanEmail);
    return {
      valid: false,
      error: 'Número máximo de tentativas excedido. Solicite um novo código de verificação.',
    };
  }

  if (record.code !== cleanCode) {
    record.attempts += 1;
    const remaining = MAX_ATTEMPTS - record.attempts;
    return {
      valid: false,
      error: `Código de verificação incorreto. Tentativas restantes: ${remaining}.`,
    };
  }

  return { valid: true };
}

/**
 * Marca o código de recuperação como verificado.
 */
export function markCodeAsVerified(email: string): void {
  const cleanEmail = email.trim().toLowerCase();
  const record = resetMap.get(cleanEmail);
  if (record) {
    record.verified = true;
  }
}

/**
 * Checa se o código do e-mail já foi previamente validado com sucesso.
 */
export function isCodeVerified(email: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const record = resetMap.get(cleanEmail);
  return !!record && !!record.verified && Date.now() <= record.expiresAt;
}

/**
 * Consome (invalida) o código de recuperação após o sucesso da redefinição de senha.
 */
export function consumeResetCode(email: string): void {
  const cleanEmail = email.trim().toLowerCase();
  resetMap.delete(cleanEmail);
}
