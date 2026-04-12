/** Contador de operações assíncronas globais (ex.: Firebase). Sem dependência de React. */

let pending = 0
const listeners = new Set<() => void>()

function notify() {
  for (const cb of listeners) {
    cb()
  }
}

export function getGlobalLoadingPending(): number {
  return pending
}

export function subscribeGlobalLoading(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Incrementa o contador até a Promise terminar (sucesso ou erro).
 * Várias chamadas em paralelo mantêm o overlay até todas concluírem.
 * Usa `Promise.resolve` para aceitar thenables e garantir `.finally`.
 */
export function trackPromise<T>(promise: PromiseLike<T>): Promise<T> {
  pending += 1
  notify()
  return Promise.resolve(promise).finally(() => {
    pending = Math.max(0, pending - 1)
    notify()
  })
}
