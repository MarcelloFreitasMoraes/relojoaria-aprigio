/**
 * O Firebase Auth exige formato de e-mail. O nome de utilizador vira
 * `usuario@<domínio>` — só este sufixo é usado no Auth; na UI trabalha-se com "usuário".
 */
export const AUTH_EMAIL_DOMAIN = 'relojoaria-aprigio-auth.local'

export function normalizeAuthUsername(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
}

export function usernameToAuthEmail(username: string): string {
  const u = normalizeAuthUsername(username)
  if (u.length < 2) {
    throw new Error('Usuário: use pelo menos 2 letras ou números (a-z, 0-9, . _ -).')
  }
  if (u.length > 64) {
    throw new Error('Usuário demasiado longo.')
  }
  return `${u}@${AUTH_EMAIL_DOMAIN}`
}

/**
 * Se o e-mail for o sintético do login por utilizador (`usuario@domínio`),
 * devolve só o nome de utilizador (ex.: `capa`), não o e-mail completo.
 * Para outros e-mails devolve `undefined` para se poder usar o e-mail real como fallback.
 */
export function authEmailToLoginUsername(
  email: string | null | undefined,
): string | undefined {
  if (!email) return undefined
  const at = email.indexOf('@')
  if (at <= 0) return undefined
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (domain === AUTH_EMAIL_DOMAIN) {
    return local
  }
  return undefined
}

export function isCapaUsername(username: string | null | undefined): boolean {
  if (!username) return false
  return normalizeAuthUsername(username) === 'capa'
}
