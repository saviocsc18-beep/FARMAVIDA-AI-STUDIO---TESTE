/**
 * Formata valores monetários da operação no padrão brasileiro.
 * Dados incompletos nunca devem gerar NaN na tela gerencial.
 */
export function formatCurrencyBRL(value: unknown): string {
  const numberValue = typeof value === 'number' ? value : Number(value);
  const safeValue = Number.isFinite(numberValue) ? numberValue : 0;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safeValue);
}

export function formatPercentage(value: unknown, fractionDigits = 1): string {
  const numberValue = typeof value === 'number' ? value : Number(value);
  const safeValue = Number.isFinite(numberValue) ? numberValue : 0;
  return `${safeValue.toFixed(fractionDigits)}%`;
}
