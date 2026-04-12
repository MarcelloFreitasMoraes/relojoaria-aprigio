import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { useFormik } from 'formik'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { deleteOrder } from '../services/ordersService'
import {
  clienteParaOrdem,
  listarClientes,
  ordenarClientesPorCodigo,
  removerCliente,
} from '../services/realtimeDatabase'
import type { Order } from '../types/order'
import { ordersListSearchSchema } from '@/schemas/ordersListPageSchema'
import type { OrdersListSearchValues } from '@/schemas/ordersListPageSchema'
import { OrdersListTableSkeleton } from '@/components/OrdersListTableSkeleton'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ORDERS_LIST_COLUMN_LABELS } from '@/constants/ordersListTable'
import { firstFormikStringError } from '@/utils/formikErrors'
import { formatOrderStatus } from '@/utils/orderLabels'
import '../styles/orders.css'
import { LoaderCircle, SquarePen, Trash } from 'lucide-react'

type SearchMode = OrdersListSearchValues['searchMode']

const SEARCH_PLACEHOLDERS: Record<SearchMode, string> = {
  code: '2026-00000X',
  name: 'Ex.: Maria Silva',
  number: 'Digite o Número',
}

const SEARCH_INITIAL: OrdersListSearchValues = {
  searchMode: 'code',
  searchValue: '',
}

type ListRow = {
  rtdbKey: string
  order: Order
}

const PAGE_SIZE = 10

type SortField =
  | 'code'
  | 'customerName'
  | 'number'
  | 'brand'
  | 'mechanism'
  | 'status'
  | 'entryDate'
  | 'criadoOuModificado'
  | 'dataCriadoOuModificado'

type SortDir = 'asc' | 'desc'

const SORT_FIELD_LABELS: Record<SortField, string> = {
  code: 'Código',
  customerName: 'Nome',
  number: 'Número',
  brand: 'Marca',
  mechanism: 'Mecanismo',
  status: 'Situação',
  entryDate: 'Entrada',
  criadoOuModificado: 'Alterado por',
  dataCriadoOuModificado: 'Última alteração',
}

function sortValueForRow(row: ListRow, field: SortField): string {
  const o = row.order
  switch (field) {
    case 'code':
      return String(o.code ?? '')
    case 'customerName':
      return String(o.customerName ?? '')
    case 'number':
      return String(o.number ?? '')
    case 'brand':
      return String(o.brand ?? '')
    case 'mechanism':
      return String(o.mechanism ?? '')
    case 'status':
      return String(o.status ?? '')
    case 'entryDate':
      return String(o.entryDate ?? '')
    case 'criadoOuModificado':
      return String(o.criadoOuModificado ?? '')
    case 'dataCriadoOuModificado':
      return String(o.dataCriadoOuModificado ?? '')
    default:
      return ''
  }
}

function compareListRows(
  a: ListRow,
  b: ListRow,
  field: SortField,
  dir: SortDir,
): number {
  const va = sortValueForRow(a, field)
  const vb = sortValueForRow(b, field)
  const numeric = field === 'code' || field === 'number'
  let cmp = va.localeCompare(vb, 'pt-BR', {
    numeric,
    sensitivity: 'base',
  })
  if (cmp === 0) {
    cmp = String(a.order.code).localeCompare(String(b.order.code), 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    })
  }
  return dir === 'asc' ? cmp : -cmp
}

export function OrdersListPage() {
  const { signOut } = useAuth()
  const [allRows, setAllRows] = useState<ListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterActive, setFilterActive] = useState(false)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [rowToDelete, setRowToDelete] = useState<ListRow | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [sortField, setSortField] = useState<SortField>('code')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const loadFromRtdb = useCallback(async () => {
    setLoading(true)
    try {
      const clientes = ordenarClientesPorCodigo(await listarClientes())
      setAllRows(
        clientes.map((c) => ({
          rtdbKey: c.id ?? '',
          order: clienteParaOrdem(c),
        })),
      )
      setFilterActive(false)
      setPageIndex(0)
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      toast.error(`Não foi possível carregar os dados de clientes. ${detail}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const searchForm = useFormik<OrdersListSearchValues>({
    initialValues: SEARCH_INITIAL,
    validationSchema: ordersListSearchSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: (values) => {
      const trimmed = values.searchValue.trim()
      if (!trimmed) {
        void loadFromRtdb()
        return
      }
      setPageIndex(0)
      setFilterActive(true)
    },
  })

  useEffect(() => {
    void loadFromRtdb()
  }, [loadFromRtdb])

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault()
    void searchForm.validateForm().then((errs) => {
      if (Object.keys(errs).length > 0) {
        toast.error(
          firstFormikStringError(errs, 'Verifique a pesquisa.'),
        )
        return
      }
      void searchForm.submitForm()
    })
  }

  async function handleClear() {
    setPageIndex(0)
    searchForm.resetForm({ values: SEARCH_INITIAL })
    setFilterActive(false)
    await loadFromRtdb()
  }

  async function handleSignOutClick() {
    await signOut()
  }

  async function confirmDelete() {
    const row = rowToDelete
    if (!row?.rtdbKey) return
    setRowToDelete(null)
    const rtdbKey = row.rtdbKey
    setDeletingKey(rtdbKey)
    try {
      if (row.order.id) {
        await deleteOrder(row.order.id)
      }
      await removerCliente(rtdbKey)
      setAllRows((prev) => prev.filter((r) => r.rtdbKey !== rtdbKey))
      const label = row.order.code || row.order.customerName || 'Registo'
      toast.success(`Ordem "${label}" excluída.`)
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      toast.error(`Não foi possível excluir. ${detail}`)
    } finally {
      setDeletingKey(null)
    }
  }

  const {
    totalCount,
    paginatedRows,
    totalPages,
    safePageIndex,
    rangeStart,
    rangeEnd,
    currentPageLabel,
  } = useMemo(() => {
    let filtered: ListRow[] = [...allRows]
    if (filterActive && searchForm.values.searchValue.trim()) {
      const q = searchForm.values.searchValue.trim().toLowerCase()
      if (searchForm.values.searchMode === 'code') {
        filtered = filtered.filter((r) =>
          String(r.order.code).toLowerCase().includes(q),
        )
      } else if (searchForm.values.searchMode === 'name') {
        filtered = filtered.filter((r) =>
          r.order.customerName.toLowerCase().includes(q),
        )
      } else {
        filtered = filtered.filter((r) =>
          String(r.order.number).toLowerCase().includes(q),
        )
      }
    }

    const sorted = [...filtered].sort((a, b) =>
      compareListRows(a, b, sortField, sortDir),
    )
    const n = sorted.length
    const pages = n === 0 ? 0 : Math.ceil(n / PAGE_SIZE)
    const safePage =
      pages === 0 ? 0 : Math.min(pageIndex, Math.max(0, pages - 1))
    const start = safePage * PAGE_SIZE
    const pageSlice = sorted.slice(start, start + PAGE_SIZE)
    const rs = n === 0 ? 0 : start + 1
    const re = n === 0 ? 0 : start + pageSlice.length

    return {
      totalCount: n,
      paginatedRows: pageSlice,
      totalPages: pages,
      safePageIndex: safePage,
      rangeStart: rs,
      rangeEnd: re,
      currentPageLabel: pages === 0 ? 0 : safePage + 1,
    }
  }, [
    allRows,
    filterActive,
    searchForm.values.searchMode,
    searchForm.values.searchValue,
    sortField,
    sortDir,
    pageIndex,
  ])

  useEffect(() => {
    setPageIndex((p) => {
      if (totalPages === 0) return 0
      if (p >= totalPages) return totalPages - 1
      return p
    })
  }, [totalPages])

  useEffect(() => {
    setPageIndex(0)
  }, [sortField, sortDir])

  const canPrev = totalPages > 0 && safePageIndex > 0
  const canNext = totalPages > 0 && safePageIndex < totalPages - 1

  return (
    <div className="app-layout bg-linear-to-br from-muted/80 via-background to-muted/40">
      <header className="app-header border-border/60 bg-background/80 backdrop-blur-md">
        <div>
          <h1 className="font-heading text-lg tracking-widest uppercase text-foreground">
            Relojoaria Aprígio
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle interno de ordens de serviço
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={handleSignOutClick}>
          Sair
        </Button>
      </header>

      <main className="orders-main">
        <section className="orders-toolbar">
          <form className="orders-search" onSubmit={handleSearchSubmit}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <Label htmlFor="orders-search-mode" className="sr-only">
                Critério
              </Label>
              <Select
                value={searchForm.values.searchMode}
                onValueChange={(v) =>
                  void searchForm.setFieldValue('searchMode', v as SearchMode)
                }
              >
                <SelectTrigger
                  id="orders-search-mode"
                  className="h-9 w-full min-w-36 rounded-full border-border sm:w-40"
                >
                  <SelectValue placeholder="Critério" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code">Código</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                </SelectContent>
              </Select>
              <Label htmlFor="orders-search-input" className="sr-only">
                Pesquisa
              </Label>
              <Input
                id="orders-search-input"
                name="searchValue"
                type="text"
                placeholder={
                  SEARCH_PLACEHOLDERS[searchForm.values.searchMode]
                }
                value={searchForm.values.searchValue}
                onChange={searchForm.handleChange}
                onBlur={searchForm.handleBlur}
                className="h-9 min-w-0 flex-1 rounded-full border-border px-3"
                aria-invalid={Boolean(
                  searchForm.touched.searchValue &&
                    searchForm.errors.searchValue,
                )}
              />
            </div>
            <Button
              type="submit"
              className="rounded-full bg-indigo-600 hover:bg-indigo-700"
            >
              Buscar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-border"
              onClick={() => void handleClear()}
            >
              Limpar
            </Button>
          </form>

          <Button
            asChild
            className="orders-new ml-auto rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Link to="/orders/new">Nova ordem</Link>
          </Button>
        </section>

        <div className="orders-sort-bar mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="orders-sort-field" className="text-sm text-muted-foreground whitespace-nowrap">
              Ordenar por
            </Label>
            <Select
              value={sortField}
              onValueChange={(v) => setSortField(v as SortField)}
            >
              <SelectTrigger
                id="orders-sort-field"
                className="h-9 w-full min-w-44 rounded-full border-border sm:w-52"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(SORT_FIELD_LABELS) as [SortField, string][]).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="orders-sort-dir" className="text-sm text-muted-foreground whitespace-nowrap">
              Ordem
            </Label>
            <Select
              value={sortDir}
              onValueChange={(v) => setSortDir(v as SortDir)}
            >
              <SelectTrigger
                id="orders-sort-dir"
                className="h-9 w-full min-w-40 rounded-full border-border sm:w-44"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Crescente</SelectItem>
                <SelectItem value="desc">Decrescente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <p
          className="orders-list-hint text-muted-foreground"
          aria-live="polite"
        >
          {filterActive
            ? 'Mostrando apenas linhas que coincidem com a busca (dados em clientes.json).'
            : 'Lista completa de clientes (Realtime Database). Ordenação e paginação aplicam-se aos resultados visíveis.'}
        </p>

        {loading && allRows.length > 0 && (
          <p className="orders-loading orders-loading-inline text-muted-foreground">
            Atualizando lista...
          </p>
        )}

        <div
          className="orders-table-wrapper border border-border/60 bg-card shadow-lg ring-1 ring-border/40"
          aria-label="Tabela de ordens de serviço"
        >
          {loading && allRows.length === 0 ? (
            <OrdersListTableSkeleton />
          ) : (
            <Table className="orders-table">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {ORDERS_LIST_COLUMN_LABELS.map((label) => (
                    <TableHead
                      key={label}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalCount === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={ORDERS_LIST_COLUMN_LABELS.length}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {filterActive
                        ? 'Nenhum registo corresponde à busca.'
                        : 'Nenhum cliente na base.'}
                    </TableCell>
                  </TableRow>
                )}
                {paginatedRows.map((row) => (
                  <TableRow
                    key={row.rtdbKey}
                    className="odd:bg-muted/20 hover:bg-muted/40"
                  >
                    <TableCell>{row.order.code}</TableCell>
                    <TableCell>{row.order.customerName}</TableCell>
                    <TableCell>{row.order.number}</TableCell>
                    <TableCell>{row.order.brand}</TableCell>
                    <TableCell>{row.order.mechanism}</TableCell>
                    <TableCell>
                      {formatOrderStatus(row.order.status)}
                    </TableCell>
                    <TableCell>{row.order.entryDate}</TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {row.order.criadoOuModificado ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-44 text-muted-foreground text-xs whitespace-normal">
                      {row.order.dataCriadoOuModificado ?? '—'}
                    </TableCell>
                    <TableCell className="orders-actions max-w-56 whitespace-normal">
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link
                          to={
                            row.order.id
                              ? `/orders/${row.order.id}/edit`
                              : `/orders/cliente/${encodeURIComponent(row.rtdbKey)}/edit`
                          }
                        >
                          <SquarePen size={16} className="cursor-pointer text-blue-500" />
                        </Link>
                      </Button>            
                        {deletingKey === row.rtdbKey ?  <LoaderCircle size={16} className="animate-spin" /> : <Trash size={16} className="cursor-pointer text-red-500" onClick={() => setRowToDelete(row)} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {!loading && totalCount > 0 ? (
          <div className="orders-pagination mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p
              className="text-sm text-muted-foreground"
              aria-live="polite"
            >
              Mostrando {rangeStart}–{rangeEnd} de {totalCount}
              {totalPages > 1
                ? ` · Página ${currentPageLabel} de ${totalPages}`
                : null}
            </p>
            {totalPages > 1 ? (
              <Pagination className="mx-0 w-full justify-end sm:w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text="Anterior"
                      aria-label="Página anterior"
                      className={
                        !canPrev ? 'pointer-events-none opacity-40' : undefined
                      }
                      onClick={(e) => {
                        e.preventDefault()
                        if (canPrev) setPageIndex((p) => p - 1)
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text="Seguinte"
                      aria-label="Página seguinte"
                      className={
                        !canNext ? 'pointer-events-none opacity-40' : undefined
                      }
                      onClick={(e) => {
                        e.preventDefault()
                        if (canNext) setPageIndex((p) => p + 1)
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}
          </div>
        ) : null}
      </main>

      <Dialog
        open={rowToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setRowToDelete(null)
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir ordem</DialogTitle>
            <DialogDescription>
              {rowToDelete
                ? `Excluir a ordem "${rowToDelete.order.code || rowToDelete.order.customerName || 'este registo'}"? Isto remove o registo em clientes e, se existir, a ordem no Firestore.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRowToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingKey !== null}
              onClick={() => void confirmDelete()}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
