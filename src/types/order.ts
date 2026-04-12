export type OrderFormType = 'loja' | 'assistencia'

export type OrderStatus = 'analise' | 'servico' | 'pronto' | 'entregue'

export interface Order {
  id?: string
  code: string
  customerName: string
  phone: string
  email?: string
  brand: string
  type: string
  caseMaterial: string
  dialColor: string
  strap: string
  mechanism: string
  number: string
  service: string
  price: number
  entryDate: string
  dueDate: string
  notes?: string
  conditions?: string
  status: OrderStatus
  formType: OrderFormType
  /** Cliente aceitou os termos no formulário (gravado no Firestore). */
  aceitoTermos?: boolean
  /** Último utilizador que gravou (nome legível); não exibido no formulário. */
  criadoOuModificado?: string
  /** Última gravação `YYYY-MM-DD HH:mm` (hora local); não exibido no formulário. */
  dataCriadoOuModificado?: string
  createdAt?: Date
  updatedAt?: Date
  createdBy?: string
}

