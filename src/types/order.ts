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
  createdAt?: Date
  updatedAt?: Date
  createdBy?: string
}

