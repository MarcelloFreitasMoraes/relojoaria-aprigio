/**
 * O Firebase Auth exige formato de e-mail. O nome de utilizador vira
 * `usuario@<domínio>` — só este sufixo é usado no Auth; na UI trabalha-se com "usuário".
 */
export const AUTH_EMAIL_DOMAIN = 'relojoaria-aprigio-auth.local'

export function usernameToAuthEmail(username: string): string {
  const u = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
  if (u.length < 2) {
    throw new Error('Usuário: use pelo menos 2 letras ou números (a-z, 0-9, . _ -).')
  }
  if (u.length > 64) {
    throw new Error('Usuário demasiado longo.')
  }
  return `${u}@${AUTH_EMAIL_DOMAIN}`
}
