import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { deleteOrder } from '../services/ordersService'
import {
  clienteParaOrdem,
  listarClientes,
  ordenarClientesPorCodigo,
  removerCliente,
} from '../services/realtimeDatabase'
import type { Order } from '../types/order'
import '../styles/orders.css'

type SearchMode = 'code' | 'name' | 'number'

type ListRow = {
  /** Chave do nó em `/clientes` (Realtime Database) */
  rtdbKey: string
  order: Order
}

export function OrdersListPage() {
  const { signOut } = useAuth()
  const [allRows, setAllRows] = useState<ListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchMode, setSearchMode] = useState<SearchMode>('code')
  const [searchValue, setSearchValue] = useState('')
  /** Com filtro ativo, a tabela mostra só linhas que batem com a busca (dados vêm de `allRows`). */
  const [filterActive, setFilterActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  useEffect(() => {
    void loadFromRtdb()
  }, [])

  /** Lista completa a partir de `GET .../clientes.json` (com auth nas regras). */
  async function loadFromRtdb() {
    setLoading(true)
    setError(null)
    try {
      const clientes = ordenarClientesPorCodigo(await listarClientes())
      setAllRows(
        clientes.map((c) => ({
          rtdbKey: c.id ?? '',
          order: clienteParaOrdem(c),
        })),
      )
      setFilterActive(false)
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      setError(`Não foi possível carregar os dados de clientes. ${detail}`)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    if (!searchValue.trim()) {
      void loadFromRtdb()
      return
    }
    setFilterActive(true)
  }

  async function handleClear() {
    setSearchValue('')
    await loadFromRtdb()
  }

  async function handleSignOutClick() {
    await signOut()
  }

  async function handleDelete(row: ListRow) {
    if (!row.rtdbKey) return
    const label = row.order.code || row.order.customerName || 'este registo'
    if (
      !window.confirm(
        `Excluir a ordem "${label}"? Isto remove o registo em clientes e, se existir, a ordem no Firestore.`,
      )
    ) {
      return
    }
    setError(null)
    setDeletingKey(row.rtdbKey)
    try {
      if (row.order.id) {
        await deleteOrder(row.order.id)
      }
      await removerCliente(row.rtdbKey)
      setAllRows((prev) => prev.filter((r) => r.rtdbKey !== row.rtdbKey))
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      setError(`Não foi possível excluir. ${detail}`)
    } finally {
      setDeletingKey(null)
    }
  }

  const displayRows = useMemo(() => {
    const sorted = [...allRows].sort((a, b) =>
      String(a.order.code).localeCompare(String(b.order.code), 'pt-BR', {
        numeric: true,
        sensitivity: 'base',
      }),
    )
    if (!filterActive || !searchValue.trim()) {
      return sorted
    }
    const q = searchValue.trim().toLowerCase()
    if (searchMode === 'code') {
      return sorted.filter((r) =>
        String(r.order.code).toLowerCase().includes(q),
      )
    }
    if (searchMode === 'name') {
      return sorted.filter((r) =>
        r.order.customerName.toLowerCase().includes(q),
      )
    }
    return sorted.filter((r) =>
      String(r.order.number).toLowerCase().includes(q),
    )
  }, [allRows, filterActive, searchValue, searchMode])

  return (
    <div className="app-layout">
      <header className="app-header">
        <div>
          <h1>Relojoaria Aprígio</h1>
          <p>Controle interno de ordens de serviço</p>
        </div>
        <button className="header-logout" onClick={handleSignOutClick}>
          Sair
        </button>
      </header>

      <main className="orders-main">
        <section className="orders-toolbar">
          <form className="orders-search" onSubmit={handleSearch}>
            <select
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as SearchMode)}
            >
              <option value="code">Código</option>
              <option value="name">Nome</option>
              <option value="number">Número</option>
            </select>
            <input
              type="text"
              placeholder="Buscar (deixe vazio e Buscar para recarregar tudo)"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <button type="submit">Buscar</button>
            <button type="button" onClick={handleClear}>
              Limpar
            </button>
          </form>

          <Link className="orders-new" to="/orders/new">
            Nova ordem
          </Link>
        </section>

        <p className="orders-list-hint" aria-live="polite">
          {filterActive
            ? 'Mostrando apenas linhas que coincidem com a busca (dados em clientes.json).'
            : 'Lista completa de clientes (Realtime Database), ordenada por código.'}
        </p>

        {error && <p className="orders-error">{error}</p>}

        {loading && allRows.length > 0 && (
          <p className="orders-loading orders-loading-inline">
            Atualizando lista...
          </p>
        )}

        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Número</th>
                <th>Marca</th>
                <th>Mecanismo</th>
                <th>Situação</th>
                <th>Entrada</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && allRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center' }}>
                    Carregando...
                  </td>
                </tr>
              ) : (
                <>
                  {displayRows.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center' }}>
                        {filterActive
                          ? 'Nenhum registo corresponde à busca.'
                          : 'Nenhum cliente na base.'}
                      </td>
                    </tr>
                  )}
                  {displayRows.map((row) => (
                    <tr key={row.rtdbKey}>
                      <td>{row.order.code}</td>
                      <td>{row.order.customerName}</td>
                      <td>{row.order.number}</td>
                      <td>{row.order.brand}</td>
                      <td>{row.order.mechanism}</td>
                      <td>{formatStatus(row.order.status)}</td>
                      <td>{row.order.entryDate}</td>
                      <td className="orders-actions">
                        <Link
                          to={
                            row.order.id
                              ? `/orders/${row.order.id}/edit`
                              : `/orders/cliente/${encodeURIComponent(row.rtdbKey)}/edit`
                          }
                        >
                          Editar ficha
                        </Link>
                        {row.order.id ? (
                          <Link to={`/orders/${row.order.id}/print`}>
                            Ficha
                          </Link>
                        ) : (
                          <span
                            className="orders-actions-missing"
                            title="Impressão usa a ordem no Firestore — edite e associe ou crie uma nova ordem"
                          >
                            Ficha
                          </span>
                        )}
                        <button
                          type="button"
                          className="orders-action-delete"
                          disabled={deletingKey === row.rtdbKey}
                          onClick={() => void handleDelete(row)}
                        >
                          {deletingKey === row.rtdbKey ? '…' : 'Excluir'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

function formatStatus(status: Order['status']) {
  switch (status) {
    case 'analise':
      return 'Em análise'
    case 'servico':
      return 'Em serviço'
    case 'pronto':
      return 'Pronto'
    case 'entregue':
      return 'Entregue'
    default:
      return status
  }
}
