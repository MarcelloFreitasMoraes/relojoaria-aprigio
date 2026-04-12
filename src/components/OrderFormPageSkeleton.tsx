import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/** Layout de carregamento alinhado à grelha do formulário de ordem. */
export function OrderFormPageSkeleton() {
  const navigate = useNavigate()

  return (
    <div className="order-form-layout">
      <div className="order-form-toolbar">
        <Button
          type="button"
          variant="outline"
          className="order-form-secondary order-form-back rounded-full border-zinc-200 font-medium"
          onClick={() => navigate('/orders')}
        >
          ← Voltar às ordens
        </Button>
      </div>

      <header className="order-form-header space-y-3">
        <Skeleton className="mx-auto h-7 w-full max-w-md" />
        <Skeleton className="mx-auto h-5 w-full max-w-sm" />
        <Skeleton className="mx-auto h-4 w-full max-w-lg" />
      </header>

      <div className="order-form space-y-4">
        <div className="order-form-topline">
          <Skeleton className="h-10 max-w-[200px] rounded-[0.6rem]" />
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-36 rounded-full" />
          </div>
        </div>

        {[1, 2, 3].map((section) => (
          <section key={section} className="order-form-section space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="order-form-grid">
              <Skeleton className="h-16 rounded-[0.6rem]" />
              <Skeleton className="h-16 rounded-[0.6rem]" />
              <Skeleton className="h-16 rounded-[0.6rem]" />
            </div>
          </section>
        ))}

        <div className="order-form-section space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-24 w-full rounded-[0.75rem]" />
        </div>

        <div className="order-form-footer flex justify-end gap-3">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
      </div>
    </div>
  )
}
