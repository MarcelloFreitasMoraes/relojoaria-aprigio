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
  return VALID_STATUS.includes(s as OrderStatus) ? (s as OrderStatus) : 'analise'
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
