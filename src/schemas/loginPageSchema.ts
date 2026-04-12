import * as yup from 'yup'

/** Validação do formulário da tela de login / cadastro (mesmos campos nos dois modos). */
export const loginPageSchema = yup.object({
  username: yup
    .string()
    .trim()
    .required('Informe o usuário.')
    .min(2, 'Use pelo menos 2 caracteres no usuário.'),
  password: yup
    .string()
    .required('Informe a senha.')
    .min(6, 'A senha deve ter pelo menos 6 caracteres.'),
})

export type LoginPageFormValues = yup.InferType<typeof loginPageSchema>
