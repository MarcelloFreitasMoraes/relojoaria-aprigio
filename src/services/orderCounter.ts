import { ref, runTransaction } from 'firebase/database'
import { trackPromise } from '@/lib/globalLoadingStore'
import { rtdb } from './firebase'

/** Nó na raiz do RTDB — alinhado com as regras `ordemServicoCounter`. */
const COUNTER_PATH = 'ordemServicoCounter'

type CounterState = { year: number; seq: number }

/**
 * Próximo número de protocolo no formato AAAA-NNNNNN (sequência reinicia por ano civil).
 * Transação no Realtime Database para não repetir com vários utilizadores/abas.
 */
export async function allocateNextOrdemServicoCode(): Promise<string> {
  const counterRef = ref(rtdb, COUNTER_PATH)

  const result = await trackPromise(
    runTransaction(counterRef, (current) => {
      const currentYear = new Date().getFullYear()
      let year: number
      let seq: number

      const c = current as CounterState | null | undefined
      if (c == null || typeof c !== 'object' || typeof c.year !== 'number') {
        year = currentYear
        seq = 1
      } else {
        const storedYear = c.year
        const storedSeq = typeof c.seq === 'number' ? c.seq : 0
        if (storedYear !== currentYear) {
          year = currentYear
          seq = 1
        } else {
          year = currentYear
          seq = storedSeq + 1
        }
      }
      return { year, seq }
    }),
  )

  const val = result.snapshot.val() as CounterState | null
  if (!val || typeof val.year !== 'number' || typeof val.seq !== 'number') {
    throw new Error(
      'Realtime Database: contador inválido após transação (ordemServicoCounter).',
    )
  }
  return `${val.year}-${String(val.seq).padStart(6, '0')}`
}
