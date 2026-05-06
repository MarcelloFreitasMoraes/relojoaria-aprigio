import type { Order, OrderStatus } from '@/types/order'

const VALID_STATUS: OrderStatus[] = ['analise', 'servico', 'pronto', 'entregue']

/**
 * Converte valor vindo do RTDB/Firestore/formulário para um `OrderStatus` válido.
 * Evita string vazia ou valores desconhecidos, que deixam o `<Select>` sem opção selecionada.
 */
export function normalizeOrderStatus(raw: unknown): OrderStatus {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (VALID_STATUS.includes(s as OrderStatus)) return s as OrderStatus
  if (s.includes('entreg')) return 'entregue'
  if (s.includes('pronto')) return 'pronto'
  if (s.includes('serv')) return 'servico'
  if (s.includes('analis')) return 'analise'
  return 'analise'
}

/** Rótulo em português para situação da ordem (lista, impressão, etc.). */
export function formatOrderStatus(status: Order['status']): string {
  switch (status) {
    case 'analise':
      return 'Em análise'
    case 'servico':
      return 'Em serviço'
    case 'pronto':
      return 'Pronto'
    case 'entregue':
      return 'Entregue'
    default:
      return String(status)
  }
}
