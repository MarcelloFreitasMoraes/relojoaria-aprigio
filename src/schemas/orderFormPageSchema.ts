import * as yup from 'yup'

import { normalizeOrderStatus } from '@/utils/orderLabels'

export type OrderFormMode = 'create' | 'edit'

/**
 * Schema Yup com campos obrigatórios da ficha.
 * `code` em criação é opcional (protocolo só existe após gravar); em edição é obrigatório.
 */
export function buildOrderFormSchema(mode: OrderFormMode) {
  return yup.object({
    id: yup.string().optional(),
    code:
      mode === 'create'
        ? yup.string().optional()
        : yup.string().trim().required('Informe o código.'),
    customerName: yup
      .string()
      .trim()
      .required('Informe o nome do cliente.'),
    phone: yup.string().defined(),
    email: yup
      .string()
      .trim()
      .defined()
      .test(
        'email',
        'E-mail inválido.',
        (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      ),
    brand: yup.string().trim().required('Informe a marca.'),
    type: yup.string().trim().required('Informe o tipo.'),
    caseMaterial: yup.string().trim().required('Informe a caixa.'),
    dialColor: yup.string().trim().required('Informe o mostrador.'),
    strap: yup.string().trim().required('Informe a pulseira.'),
    mechanism: yup.string().trim().required('Informe o mecanismo.'),
    number: yup.string().defined(),
    service: yup.string().trim().required('Informe o serviço.'),
    price: yup
      .number()
      .required()
      .min(0, 'O valor não pode ser negativo.'),
    entryDate: yup
      .string()
      .required('Informe a data de entrada.')
      .test(
        'date-non-empty',
        'Informe a data de entrada.',
        (v) => Boolean(v && String(v).trim()),
      ),
    dueDate: yup
      .string()
      .test(
        'after-entry',
        'A data prevista não pode ser anterior à data de entrada.',
        function (value) {
          const v = value != null && String(value).trim()
          if (!v) return true
          const entry = this.parent.entryDate
          if (entry == null || !String(entry).trim()) return true
          return String(v) >= String(entry).trim()
        },
      ),
    notes: yup.string().optional(),
    conditions: yup.string().optional(),
    status: yup
      .mixed()
      .transform((v) => normalizeOrderStatus(v))
      .oneOf(
        ['analise', 'servico', 'pronto', 'entregue'],
        'Escolha uma situação.',
      ),
    formType: yup.string().oneOf(['loja', 'assistencia']).required(),
    criadoOuModificado: yup.string().optional(),
    dataCriadoOuModificado: yup.string().optional(),
    aceitoTermos: yup.boolean().optional(),
  })
}
