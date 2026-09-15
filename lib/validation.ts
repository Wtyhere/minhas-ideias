/**
 * Normaliza um CNPJ (numérico ou alfanumérico), removendo pontuação e convertendo para maiúsculas.
 */
export function normalizeCnpj(cnpj: string): string {
  if (!cnpj) return '';
  return cnpj.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Formata um CNPJ (numérico ou alfanumérico) com a máscara XX.XXX.XXX/XXXX-XX.
 */
export function formatCnpj(val: string): string {
  let clean = normalizeCnpj(val);
  if (clean.length > 14) clean = clean.substring(0, 14);

  if (clean.length > 12) {
    return clean.replace(/^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})([0-9]{1,2})$/, '$1.$2.$3/$4-$5');
  } else if (clean.length > 8) {
    return clean.replace(/^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{1,4})$/, '$1.$2.$3/$4');
  } else if (clean.length > 5) {
    return clean.replace(/^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{1,3})$/, '$1.$2.$3');
  } else if (clean.length > 2) {
    return clean.replace(/^([A-Z0-9]{2})([A-Z0-9]{1,3})$/, '$1.$2');
  }
  return clean;
}

/**
 * Valida se uma string é um CNPJ válido segundo a regra da Receita Federal.
 * Suporta tanto o padrão numérico tradicional quanto o novo padrão alfanumérico (IN RFB).
 *
 * Regras:
 * - 14 caracteres: as primeiras 12 posições são alfanuméricas (0-9, A-Z) e as 2 últimas numéricas (DVs).
 * - Conversão dos caracteres alfanuméricos via valor ASCII menos 48.
 * - Módulo 11 com os pesos oficiais:
 *   - DV1: pesos [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
 *   - DV2: pesos [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
 * - Resto < 2 -> DV = 0; caso contrário DV = 11 - Resto.
 */
export function isValidCnpj(cnpj: string): boolean {
  if (!cnpj) return false;

  const clean = normalizeCnpj(cnpj);

  // Deve possuir exatamente 14 posições
  if (clean.length !== 14) return false;

  // As 12 primeiras posições podem ser letras ou números, as 2 últimas DEVEM ser numéricas
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(clean)) return false;

  // Rejeita sequências com todos os caracteres idênticos (ex: 00000000000000, AAAAAAAAAAAAAA)
  if (/^([A-Z0-9])\1{13}$/.test(clean)) return false;

  // Cálculo do 1º dígito verificador (DV1)
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    // Para '0'-'9', charCode - 48 resulta em 0-9. Para 'A'-'Z', charCode - 48 resulta em 17-42.
    sum1 += (clean.charCodeAt(i) - 48) * weights1[i];
  }
  const rest1 = sum1 % 11;
  const d1 = rest1 < 2 ? 0 : 11 - rest1;
  if (d1 !== parseInt(clean[12], 10)) return false;

  // Cálculo do 2º dígito verificador (DV2)
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 12; i++) {
    sum2 += (clean.charCodeAt(i) - 48) * weights2[i];
  }
  sum2 += d1 * weights2[12]; // Inclui o primeiro DV
  const rest2 = sum2 % 11;
  const d2 = rest2 < 2 ? 0 : 11 - rest2;
  if (d2 !== parseInt(clean[13], 10)) return false;

  return true;
}

/**
 * Formata uma data para o padrão brasileiro (DD/MM/AAAA).
 * Trata tanto strings ISO (2026-08-20, 2026-08-20T14:30:00Z) quanto datas locais e objetos Date.
 * Previne problemas de fuso horário UTC em datas no formato YYYY-MM-DD.
 */
export function formatDateBR(dateVal?: string | Date | null): string {
  if (!dateVal) return '—';

  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(dateVal);
  }

  const str = String(dateVal).trim();
  if (!str) return '—';

  // Se já estiver no formato brasileiro DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // Formato puramente YYYY-MM-DD (sem sufixo de hora nem fuso)
  const ymdOnly = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdOnly) {
    const [, year, month, day] = ymdOnly;
    return `${day}/${month}/${year}`;
  }

  // Formato ISO com timestamp ou outros formatos parseáveis
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    }
  } catch {
    // fallback
  }

  // Se contiver YYYY-MM-DD em qualquer ponto
  const anyYmd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (anyYmd) {
    const [, year, month, day] = anyYmd;
    return `${day}/${month}/${year}`;
  }

  return str;
}

/**
 * Formata uma data e hora para o padrão brasileiro (DD/MM/AAAA às HH:mm).
 */
export function formatDateTimeBR(dateVal?: string | Date | null): string {
  if (!dateVal) return '—';

  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (!isNaN(d.getTime())) {
      const datePart = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);

      const timePart = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);

      return `${datePart} às ${timePart}`;
    }
  } catch {
    // fallback
  }

  return formatDateBR(dateVal);
}
