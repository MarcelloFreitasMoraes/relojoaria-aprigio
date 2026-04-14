import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrderById } from '../services/ordersService'
import type { Order } from '../types/order'
import '../styles/order-print.css'

export function OrderPrintPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()

    async function load() {
      if (!id) return
      try {
        const data = await getOrderById(id)
        setOrder(data)
      } catch (err) {
        setError('Não foi possível carregar a ordem.')
      } finally {
        setLoading(false)
      }
    }
  }, [id])

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="print-layout">
        <p>Carregando...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="print-layout">
        <p>{error}</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="print-layout">
        <p>Ordem não encontrada.</p>
      </div>
    )
  }

  const isAssistencia = order.formType === 'assistencia'

  return (
    <div className="print-layout">
      <div className="print-actions no-print">
        <button onClick={handlePrint}>Imprimir / Salvar em PDF</button>
      </div>

      <div className="print-sheet">
        <header className="print-header">
          <h1>RELOJOARIA APRÍGIO - Valença RJ</h1>
          {isAssistencia ? (
            <h2>SOLICITAÇÃO DE ENVIO DE RELÓGIO PARA ASSISTÊNCIA TÉCNICA</h2>
          ) : (
            <h2>ORDEM DE SERVIÇO – LOJA</h2>
          )}
          <p>
            Rua dos Mineiros, 52 Loja 1 C. Via Veneto Valença-RJ. Cel (024){' '}
            99866-8112
          </p>
        </header>

        <section className="print-row">
          <div>
            <span className="print-label">Código:</span>
            <span>{order.code}</span>
          </div>
          <div>
            <span className="print-label">Mecanismo:</span>
            <span>{order.mechanism}</span>
          </div>
          <div>
            <span className="print-label">Número:</span>
            <span>{order.number}</span>
          </div>
        </section>

        <section className="print-grid">
          <div>
            <span className="print-label">Nome:</span>
            <span>{order.customerName}</span>
          </div>
          <div>
            <span className="print-label">Telefone:</span>
            <span>{order.phone}</span>
          </div>
          <div>
            <span className="print-label">E-mail:</span>
            <span>{order.email}</span>
          </div>
          <div>
            <span className="print-label">Marca:</span>
            <span>{order.brand}</span>
          </div>
          <div>
            <span className="print-label">Tipo:</span>
            <span>{order.type}</span>
          </div>
          <div>
            <span className="print-label">Caixa:</span>
            <span>{order.caseMaterial}</span>
          </div>
          <div>
            <span className="print-label">Mostrador:</span>
            <span>{order.dialColor}</span>
          </div>
          <div>
            <span className="print-label">Pulseira:</span>
            <span>{order.strap}</span>
          </div>
        </section>

        <section className="print-grid">
          <div>
            <span className="print-label">Serviço:</span>
            <span>{order.service}</span>
          </div>
          <div>
            <span className="print-label">Valor:</span>
            <span>
              {order.price.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
          </div>
          <div>
            <span className="print-label">Data entrada:</span>
            <span>{order.entryDate}</span>
          </div>
          <div>
            <span className="print-label">Data prevista:</span>
            <span>{order.dueDate}</span>
          </div>
          <div>
            <span className="print-label">Situação:</span>
            <span>{order.status}</span>
          </div>
        </section>

        <section className="print-notes print-notes-grid">
          <p className="print-notes-inline print-notes-grid-cell">
            <span className="print-label">Observação:</span>{" "}
            <span>{order.notes?.trim() || "—"}</span>
          </p>
          <p className="print-notes-inline print-notes-grid-cell">
            <span className="print-label">Condições:</span>{" "}
            <span>{order.conditions?.trim() || "—"}</span>
          </p>
        </section>

        <section className="print-terms">
          {isAssistencia ? (
            <p>
              Trata-se de uma solicitação para envio do relógio do cliente acima
              discriminado para a Assistência Técnica no Rio de Janeiro. O
              orçamento será realizado na Assistência Técnica especificada pelo
              lojista. Os valores referentes ao conserto aceitos serão somados
              à taxa de envio. A responsabilidade pelo transporte e envio do
              objeto é do lojista e do cliente, conforme regras da relojoaria.
            </p>
          ) : (
            <p>
              O cliente autoriza a entrega dos objetos aqui mencionados ao
              portador deste talão. Os serviços serão executados conforme
              descrito e o cliente será avisado quando o relógio estiver pronto.
              Após 180 dias da data de entrega, os objetos não retirados poderão
              ser vendidos para pagamento das despesas de guarda e conserto.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

