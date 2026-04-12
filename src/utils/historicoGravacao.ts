import type { User } from 'firebase/auth'

/** Data/hora local no formato YYYY-MM-DD HH:mm */
export function formatarDataHoraLocalParaHistorico(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

export function historicoGravacaoFromUser(user: User): {
  criadoOuModificado: string
  dataCriadoOuModificado: string
} {
  const nome =
    user.displayName?.trim() || user.email || user.uid
  return {
    criadoOuModificado: nome,
    dataCriadoOuModificado: formatarDataHoraLocalParaHistorico(),
  }
}
