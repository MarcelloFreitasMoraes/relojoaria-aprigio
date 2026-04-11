import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  createOrder,
  getOrderById,
  updateOrder,
} from '../services/ordersService'
import {
  atualizarEspelhoClientesPorOrdem,
  clientePayloadDaOrdem,
  criarCliente,
  clienteParaOrdem,
  atualizarCliente,
  obterCliente,
} from '../services/realtimeDatabase'
import type { Order, OrderFormType, OrderStatus } from '../types/order'
import '../styles/order-form.css'

type FormMode = 'create' | 'edit'

const emptyOrder: Order = {
  code: '',
  customerName: '',
  phone: '',
  email: '',
  brand: '',
  type: '',
  caseMaterial: '',
  dialColor: '',
  strap: '',
  mechanism: '',
  number: '',
  service: '',
  price: 0,
  entryDate: '',
  dueDate: '',
  notes: '',
  conditions: '',
  status: 'analise',
  formType: 'loja',
}

export function OrderFormPage() {
  const { id, clienteId } = useParams<{
    id?: string
    clienteId?: string
  }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order>(emptyOrder)
  const [loading, setLoading] = useState<boolean>(!!id || !!clienteId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mode: FormMode = id || clienteId ? 'edit' : 'create'

  useEffect(() => {
    if (clienteId) {
      void loadFromClienteRtdb()
    } else if (id) {
      void loadFromFirestore()
    }

    async function loadFromFirestore() {
      try {
        const existing = await getOrderById(id!)
        if (existing) {
          setOrder(existing)
        }
      } catch (err) {
        setError('Não foi possível carregar a ordem.')
      } finally {
        setLoading(false)
      }
    }

    async function loadFromClienteRtdb() {
      try {
        const c = await obterCliente(clienteId!)
        if (c) {
          setOrder(clienteParaOrdem(c))
        }
      } catch (err) {
        setError('Não foi possível carregar a ficha (Realtime Database).')
      } finally {
        setLoading(false)
      }
    }
  }, [id, clienteId])

  function handleChange<K extends keyof Order>(field: K, value: Order[K]) {
    setOrder((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)

    try {
      if (mode === 'create') {
        const created = await createOrder(
          {
            ...order,
            price: Number(order.price || 0),
          },
          user,
        )

        await criarCliente({
          ...clientePayloadDaOrdem(order),
          idFirestore: created.id,
        })
      } else if (id) {
        const { id: _oid, ...payload } = order
        await updateOrder(id, {
          ...payload,
          price: Number(order.price || 0),
        })
        await atualizarEspelhoClientesPorOrdem(id, order)
      } else if (clienteId) {
        const payloadCliente = {
          ...clientePayloadDaOrdem(order),
          idFirestore: order.id,
        }
        await atualizarCliente(clienteId, payloadCliente)
        if (order.id) {
          const { id: _oid, ...payload } = order
          await updateOrder(order.id, {
            ...payload,
            price: Number(order.price || 0),
          })
        }
      }

      navigate('/orders')
    } catch (err) {
      setError('Erro ao salvar a ordem. Verifique os dados e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  function headerTitle(type: OrderFormType) {
    if (type === 'assistencia') {
      return 'SOLICITAÇÃO DE ENVIO DE RELÓGIO PARA ASSISTÊNCIA TÉCNICA'
    }
    return 'ORDEM DE SERVIÇO – LOJA'
  }

  function termsText(type: OrderFormType) {
    if (type === 'assistencia') {
      return 'Trata-se de uma solicitação para envio do relógio do cliente acima discriminado para a Assistência Técnica no Rio de Janeiro. O orçamento será realizado na Assistência Técnica especificada pelo lojista dentro do prazo informado pela oficina. Os valores referentes ao conserto aceitos serão somados à taxa de envio. A responsabilidade pelo transporte e envio do objeto é do lojista e do cliente, conforme regras da relojoaria.'
    }
    return 'O cliente autoriza a entrega dos objetos aqui mencionados ao portador deste talão. Os serviços serão executados conforme descrito e o cliente será avisado quando o relógio estiver pronto. Após 180 dias da data de entrega, os objetos não retirados poderão ser vendidos para pagamento das despesas de guarda e conserto.'
  }

  if (loading) {
    return (
      <div className="order-form-layout">
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div className="order-form-layout">
      <header className="order-form-header">
        <h1>Relojoaria Aprígio - Valença RJ</h1>
        <p>{headerTitle(order.formType)}</p>
        <p className="order-form-subheader">
          Rua dos Mineiros, 52 Loja 1 C. Via Veneto Valença-RJ. Cel (024)
          99866-8112
        </p>
      </header>

      <form className="order-form" onSubmit={handleSubmit}>
        <section className="order-form-topline">
          <div>
            <label>
              Código
              <input
                type="text"
                value={order.code}
                onChange={(e) => handleChange('code', e.target.value)}
                required
              />
            </label>
          </div>
          <div className="order-form-type-toggle">
            <span>Tipo de ficha:</span>
            <label>
              <input
                type="radio"
                name="formType"
                value="loja"
                checked={order.formType === 'loja'}
                onChange={() => handleChange('formType', 'loja')}
              />
              Loja
            </label>
            <label>
              <input
                type="radio"
                name="formType"
                value="assistencia"
                checked={order.formType === 'assistencia'}
                onChange={() => handleChange('formType', 'assistencia')}
              />
              Assistência técnica
            </label>
          </div>
        </section>

        <section className="order-form-section">
          <h2>Dados do cliente</h2>
          <div className="order-form-grid">
            <label>
              Nome
              <input
                type="text"
                value={order.customerName}
                onChange={(e) => handleChange('customerName', e.target.value)}
                required
              />
            </label>
            <label>
              Telefone
              <input
                type="text"
                value={order.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </label>
            <label>
              E-mail
              <input
                type="email"
                value={order.email ?? ''}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="order-form-section">
          <h2>Dados do relógio</h2>
          <div className="order-form-grid">
            <label>
              Marca
              <input
                type="text"
                value={order.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
              />
            </label>
            <label>
              Tipo
              <input
                type="text"
                value={order.type}
                onChange={(e) => handleChange('type', e.target.value)}
              />
            </label>
            <label>
              Caixa
              <input
                type="text"
                value={order.caseMaterial}
                onChange={(e) => handleChange('caseMaterial', e.target.value)}
              />
            </label>
            <label>
              Mostrador
              <input
                type="text"
                value={order.dialColor}
                onChange={(e) => handleChange('dialColor', e.target.value)}
              />
            </label>
            <label>
              Pulseira
              <input
                type="text"
                value={order.strap}
                onChange={(e) => handleChange('strap', e.target.value)}
              />
            </label>
            <label>
              Mecanismo
              <input
                type="text"
                value={order.mechanism}
                onChange={(e) => handleChange('mechanism', e.target.value)}
              />
            </label>
            <label>
              Número
              <input
                type="text"
                value={order.number}
                onChange={(e) => handleChange('number', e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="order-form-section">
          <h2>Serviço</h2>
          <div className="order-form-grid">
            <label className="order-form-full">
              Serviço
              <input
                type="text"
                value={order.service}
                onChange={(e) => handleChange('service', e.target.value)}
              />
            </label>
            <label>
              Valor (R$)
              <input
                type="number"
                step="0.01"
                value={String(order.price ?? 0)}
                onChange={(e) =>
                  handleChange('price', Number(e.target.value || 0))
                }
              />
            </label>
            <label>
              Data entrada
              <input
                type="date"
                value={order.entryDate}
                onChange={(e) => handleChange('entryDate', e.target.value)}
              />
            </label>
            <label>
              Data prevista
              <input
                type="date"
                value={order.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
              />
            </label>
            <label>
              Situação
              <select
                value={order.status}
                onChange={(e) =>
                  handleChange('status', e.target.value as OrderStatus)
                }
              >
                <option value="analise">Em análise</option>
                <option value="servico">Em serviço</option>
                <option value="pronto">Pronto</option>
                <option value="entregue">Entregue</option>
              </select>
            </label>
          </div>

          <div className="order-form-grid">
            <label className="order-form-full">
              Observações
              <textarea
                value={order.notes ?? ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
              />
            </label>
            <label className="order-form-full">
              Condições
              <textarea
                value={order.conditions ?? ''}
                onChange={(e) => handleChange('conditions', e.target.value)}
                rows={2}
              />
            </label>
          </div>
        </section>

        <section className="order-form-section">
          <h2>Termos do serviço</h2>
          <p className="order-form-terms">
            {termsText(order.formType)}
          </p>
        </section>

        {error && <p className="order-form-error">{error}</p>}

        <footer className="order-form-footer">
          <button
            type="button"
            className="order-form-secondary"
            onClick={() => navigate(-1)}
          >
            Cancelar
          </button>
          <button type="submit" className="order-form-primary" disabled={saving}>
            {saving
              ? 'Salvando...'
              : mode === 'edit'
                ? 'Salvar ficha'
                : 'Salvar ordem'}
          </button>
        </footer>
      </form>
    </div>
  )
}

