import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Função utilitária para combinar classes Tailwind de forma segura.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatação monetária padronizada em Real Brasileiro (R$ 1.250,50).
 * Seguro contra valores nulos, indefinidos ou inválidos.
 */
export function formatMoney(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

/**
 * Formata quantidades com separador de milhar brasileiro.
 */
export function formatQty(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat("pt-BR").format(safe);
}

/**
 * Formata percentual com vírgula (ex: 15,5%).
 */
export function formatPercent(value: unknown, fractionDigits = 1): string {
  const num = typeof value === "number" ? value : Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return `${safe.toFixed(fractionDigits).replace(".", ",")}%`;
}

/**
 * Formata data e hora no padrão brasileiro (DD/MM/AAAA HH:mm).
 */
export function formatDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "-";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formata apenas data no padrão brasileiro (DD/MM/AAAA).
 */
export function formatDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "-";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Calcula a quantidade de dias restantes até uma data de validade.
 * Retorna número negativo se já estiver vencido.
 */
export function daysUntil(dateInput: string | Date | undefined | null): number {
  if (!dateInput) return 9999;
  try {
    const target = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(target.getTime())) return 9999;
    const now = new Date();
    // Zerar horas para cálculo exato de dias
    const d1 = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.ceil((d1 - d2) / (1000 * 60 * 60 * 24));
  } catch {
    return 9999;
  }
}
