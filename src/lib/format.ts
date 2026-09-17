/**
 * Utilitários de Formatação Padronizados para o FarmaVida
 * Padrão brasileiro (pt-BR) para valores monetários, percentuais, datas, CPF/CNPJ e quantidades.
 * Regra: Dados nulos, indefinidos ou inválidos NUNCA devem gerar NaN ou crash na interface.
 */

export function formatCurrencyBRL(value: unknown): string {
  const numberValue = typeof value === 'number' ? value : Number(value);
  const safeValue = Number.isFinite(numberValue) ? numberValue : 0;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

// Alias conveniente
export const formatMoney = formatCurrencyBRL;
export const formatBRL = formatCurrencyBRL;

export function formatPercentage(value: unknown, fractionDigits = 1): string {
  const numberValue = typeof value === 'number' ? value : Number(value);
  const safeValue = Number.isFinite(numberValue) ? numberValue : 0;
  return `${safeValue.toFixed(fractionDigits).replace('.', ',')}%`;
}

export function formatQuantity(value: unknown): string {
  const numberValue = typeof value === 'number' ? value : Number(value);
  const safeValue = Number.isFinite(numberValue) ? numberValue : 0;
  return new Intl.NumberFormat('pt-BR').format(safeValue);
}

export const formatQty = formatQuantity;

export function daysUntil(dateInput: string | Date | undefined | null): number {
  if (!dateInput) return 9999;
  try {
    const target = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(target.getTime())) return 9999;
    const now = new Date();
    const d1 = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.ceil((d1 - d2) / (1000 * 60 * 60 * 24));
  } catch {
    return 9999;
  }
}

export function formatCpfCnpj(value: string | undefined | null): string {
  if (!value) return '';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

export function formatPhoneBR(value: string | undefined | null): string {
  if (!value) return '';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return value;
}

export function formatDateBR(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

export function formatDateTimeBR(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}
