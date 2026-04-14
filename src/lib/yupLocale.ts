import { setLocale } from 'yup'

setLocale({
  mixed: {
    default: 'Valor inválido.',
    required: 'Este campo é obrigatório.',
    defined: 'Este campo é obrigatório.',
    oneOf: 'Selecione uma opção válida.',
    notType: 'Formato inválido.',
  },
  string: {
    min: 'Deve ter pelo menos ${min} caracteres.',
    max: 'Deve ter no máximo ${max} caracteres.',
    email: 'E-mail inválido.',
  },
  number: {
    min: 'Deve ser maior ou igual a ${min}.',
    max: 'Deve ser menor ou igual a ${max}.',
    integer: 'Deve ser um número inteiro.',
    positive: 'Deve ser maior que zero.',
  },
})
