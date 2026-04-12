import * as yup from 'yup'

export type OrdersListSearchMode = 'code' | 'name' | 'number'

export const ordersListSearchSchema = yup.object({
  searchMode: yup
    .string()
    .oneOf(['code', 'name', 'number'] as const)
    .required(),
  searchValue: yup
    .string()
    .max(120, 'Máximo de 120 caracteres na pesquisa.'),
})

export type OrdersListSearchValues = {
  searchMode: OrdersListSearchMode
  searchValue: string
}
