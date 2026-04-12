import type { FormikErrors } from 'formik'

/** Primeira mensagem de erro em string (campos simples). */
export function firstFormikStringError<T extends object>(
  errs: FormikErrors<T>,
  fallback: string,
): string {
  for (const key of Object.keys(errs) as (keyof T)[]) {
    const v = errs[key]
    if (typeof v === 'string') return v
  }
  return fallback
}
