/** Telefone BR: (DD) NNNNN-NNNN ou (DD) NNNN-NNNN — até 11 dígitos. */
export function maskPhoneBR(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** E-mail: remove espaços, minúsculas (máscara/validação básica). */
export function normalizeEmailInput(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toLowerCase()
}

/** Valor em centavos (string só com dígitos) → número em reais. */
export function centsDigitsToNumber(digits: string): number {
  const n = parseInt(digits.replace(/\D/g, '') || '0', 10)
  return n / 100
}

/** Exibição pt-BR a partir dos centavos digitados. */
export function formatMoneyFromCentDigits(digits: string): string {
  return centsDigitsToNumber(digits).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Número em reais → string de centavos para o estado da máscara. */
export function priceToCentDigits(price: number): string {
  return String(Math.round((price ?? 0) * 100))
}
