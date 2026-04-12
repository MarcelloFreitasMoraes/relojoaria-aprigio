import {
  type ReactNode,
  useEffect,
  useState,
} from 'react'
import { Loader2 } from 'lucide-react'
import {
  getGlobalLoadingPending,
  subscribeGlobalLoading,
} from '@/lib/globalLoadingStore'
import { cn } from '@/lib/utils'

export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(getGlobalLoadingPending)

  useEffect(() => {
    return subscribeGlobalLoading(() => {
      setPending(getGlobalLoadingPending())
    })
  }, [])

  const active = pending > 0

  useEffect(() => {
    document.body.setAttribute('aria-busy', active ? 'true' : 'false')
    return () => {
      document.body.removeAttribute('aria-busy')
    }
  }, [active])

  return (
    <>
      {children}
      {active ? (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={cn(
            'fixed inset-0 z-[100] flex items-center justify-center',
            'pointer-events-auto',
          )}
        >
          <span className="sr-only">A carregar, aguarde.</span>
          <div
            className="absolute inset-0 bg-background/55 backdrop-blur-[2px]"
            aria-hidden
          />
          <div
            className="relative flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card/95 px-8 py-6 shadow-lg"
            aria-hidden
          >
            <Loader2
              className="size-10 animate-spin text-primary"
              strokeWidth={2}
            />
            <p className="text-sm text-muted-foreground">A carregar…</p>
          </div>
        </div>
      ) : null}
    </>
  )
}
