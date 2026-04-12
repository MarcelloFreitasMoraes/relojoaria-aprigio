import { auth } from './firebase'
import type { Order, OrderFormType } from '../types/order'
import { normalizeOrderStatus } from '../utils/orderLabels'

const RTDB_BASE_URL =
  'https://relojoaria-aprigio-cad-cli-default-rtdb.firebaseio.com'

type RtdbMap<T> = Record<string, T> | null

const RTDB_FETCH_MS = 60_000

function rtdbFetchSignal(): AbortSignal {
  return AbortSignal.timeout(RTDB_FETCH_MS)
}

/**
 * Token para `?auth=` nas URLs REST do RTDB (cache local; evita vários pedidos em sequência).
 * Usa `getIdToken(false)` para não forçar refresh em cada chamada.
 */
export async function getRtdbAuthToken(): Promise<string | undefined> {
  const user = auth.currentUser
  if (!user) return undefined
  return user.getIdToken(false)
}

/** URL REST do RTDB com token do utilizador (necessário se as regras exigirem auth). */
async function urlRtdb(path: string, authToken?: string): Promise<string> {
  const base = `${RTDB_BASE_URL}/${path}.json`
  const user = auth.currentUser
  if (!user) return base
  const token =
    authToken !== undefined ? authToken : await user.getIdToken(false)
  return `${base}?auth=${encodeURIComponent(token)}`
}

export type Cliente = {
  id?: string
  /** ID do documento em Firestore (`orders`) — usado na lista para Editar/Ficha */
  idFirestore?: string
  nome?: string
  telefone?: string
  email?: string
  /** Campos adicionais gravados a partir da ficha de ordem (Realtime Database) */
  codigo?: string
  marca?: string
  tipo?: string
  caixa?: string
  mostrador?: string
  pulseira?: string
  mecanismo?: string
  numero?: string
  servico?: string
  valor?: number
  dataEntrada?: string
  dataPrevista?: string
  observacoes?: string
  condicoes?: string
  situacao?: string
  tipoFicha?: string
  criadoOuModificado?: string
  dataCriadoOuModificado?: string
  [key: string]: any
}

/** Monta o objeto enviado a `/clientes` com todos os dados da ficha (espelho da ordem). */
export function clientePayloadDaOrdem(order: Order): Omit<Cliente, 'id'> {
  const valor = Number(order.price ?? 0)
  return {
    nome: order.customerName,
    telefone: order.phone,
    email: order.email ?? '',
    codigo: String(order.code ?? ''),
    marca: order.brand,
    tipo: order.type,
    caixa: order.caseMaterial,
    mostrador: order.dialColor,
    pulseira: order.strap,
    mecanismo: order.mechanism,
    numero: order.number,
    servico: order.service,
    valor: Number.isFinite(valor) ? valor : 0,
    dataEntrada: order.entryDate,
    dataPrevista: order.dueDate,
    observacoes: order.notes ?? '',
    condicoes: order.conditions ?? '',
    situacao: order.status,
    tipoFicha: order.formType,
    criadoOuModificado: order.criadoOuModificado,
    dataCriadoOuModificado: order.dataCriadoOuModificado,
  }
}

async function fetchJson<T>(
  path: string,
  options?: RequestInit,
  authToken?: string,
): Promise<T> {
  const url = await urlRtdb(path, authToken)
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
    signal: rtdbFetchSignal(),
  })

  if (!res.ok) {
    throw new Error(`Erro na requisição RTDB: ${res.status} ${res.statusText}`)
  }

  const text = await res.text()
  if (!text.trim()) {
    return null as T
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('Resposta RTDB inválida (não é JSON).')
  }
}

function withoutId<T extends { id?: unknown }>(data: T): Omit<T, 'id'> {
  const { id, ...rest } = data
  return rest
}

export async function listarClientes(): Promise<Cliente[]> {
  const data = await fetchJson<RtdbMap<Cliente>>('clientes')
  if (!data) return []

  return Object.entries(data).map(([id, value]) => ({
    id,
    ...value,
  }))
}

/** Converte registo RTDB `/clientes` para o formato de ordem usado na UI. */
export function clienteParaOrdem(c: Cliente): Order {
  const statusOk = normalizeOrderStatus(c.situacao)
  const tipoFicha: OrderFormType =
    c.tipoFicha === 'assistencia' ? 'assistencia' : 'loja'

  return {
    id: c.idFirestore ?? undefined,
    code: String(c.codigo ?? ''),
    customerName: c.nome ?? '',
    phone: c.telefone ?? '',
    email: c.email,
    brand: c.marca ?? '',
    type: c.tipo ?? '',
    caseMaterial: c.caixa ?? '',
    dialColor: c.mostrador ?? '',
    strap: c.pulseira ?? '',
    mechanism: c.mecanismo ?? '',
    number: c.numero ?? '',
    service: c.servico ?? '',
    price: typeof c.valor === 'number' ? c.valor : Number(c.valor ?? 0),
    entryDate: c.dataEntrada ?? '',
    dueDate: c.dataPrevista ?? '',
    notes: c.observacoes,
    conditions: c.condicoes,
    status: statusOk,
    formType: tipoFicha,
    criadoOuModificado:
      typeof c.criadoOuModificado === 'string' ? c.criadoOuModificado : undefined,
    dataCriadoOuModificado:
      typeof c.dataCriadoOuModificado === 'string'
        ? c.dataCriadoOuModificado
        : undefined,
  }
}

export function ordenarClientesPorCodigo(clientes: Cliente[]): Cliente[] {
  return [...clientes].sort((a, b) =>
    String(a.codigo ?? '').localeCompare(String(b.codigo ?? ''), 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}

export async function obterCliente(id: string): Promise<Cliente | null> {
  const data = await fetchJson<Cliente | null>(`clientes/${id}`)
  if (!data) return null
  return { id, ...data }
}

async function readRtdbErrorBody(res: Response): Promise<string> {
  const text = await res.text()
  if (!text) return res.statusText
  try {
    const j = JSON.parse(text) as { error?: string }
    return typeof j.error === 'string' ? j.error : text
  } catch {
    return text
  }
}

export async function criarCliente(
  dados: Omit<Cliente, 'id'>,
  authToken?: string,
): Promise<{ cliente: Cliente; status: number }> {
  if (!auth.currentUser) {
    throw new Error(
      'Sessão inválida. Saia e entre novamente para gravar em /clientes.',
    )
  }

  const url = await urlRtdb('clientes', authToken)
  const res = await fetch(url, {
    method: 'POST',
    signal: rtdbFetchSignal(),
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(withoutId(dados)),
  })

  if (!res.ok) {
    const detail = await readRtdbErrorBody(res)
    throw new Error(
      `Realtime Database (/clientes): ${res.status} — ${detail}`,
    )
  }

  const body = (await res.json()) as { name: string }
  const cliente: Cliente = { ...dados, id: body.name }
  return { cliente, status: res.status }
}

export async function atualizarCliente(
  id: string,
  dados: Partial<Cliente>,
  authToken?: string,
): Promise<void> {
  await fetchJson(
    `clientes/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(withoutId(dados as Cliente)),
    },
    authToken,
  )
}

/**
 * Mantém o espelho em `/clientes` alinhado com a ordem no Firestore
 * (cria o nó se ainda não existir com esse `idFirestore`).
 */
export async function atualizarEspelhoClientesPorOrdem(
  firestoreId: string,
  order: Order,
): Promise<void> {
  const payload: Omit<Cliente, 'id'> = {
    ...clientePayloadDaOrdem(order),
    idFirestore: firestoreId,
  }
  const clientes = await listarClientes()
  const found = clientes.find((c) => c.idFirestore === firestoreId)
  if (found?.id) {
    await atualizarCliente(found.id, payload)
  } else {
    await criarCliente(payload)
  }
}

export async function removerCliente(id: string): Promise<void> {
  await fetchJson(`clientes/${id}`, {
    method: 'DELETE',
  })
}

/** Perfil de login por UID Firebase (`/usuarios/{uid}`) — nome como no formulário (vários utilizadores). */
export type PerfilUsuarioRtdb = {
  nomeUsuario: string
  atualizadoEm: string
}

/**
 * Grava o nome de utilizador do login (ex.: CAPA) em `/usuarios/{uid}`.
 * Complementa o `displayName` no Auth; regras RTDB devem permitir escrita em `usuarios/{uid}` ao próprio `auth.uid`.
 */
export async function salvarPerfilUsuarioRtdb(
  uid: string,
  nomeUsuario: string,
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error(
      'Sessão inválida ao gravar o perfil do utilizador.',
    )
  }
  const payload: PerfilUsuarioRtdb = {
    nomeUsuario: nomeUsuario.trim(),
    atualizadoEm: new Date().toISOString(),
  }
  await fetchJson(`usuarios/${uid}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/**
 * POST em `/login.json` — espelho usuario/senha no Realtime Database.
 * Deve ser chamado **depois** de `createUserWithEmailAndPassword`, para o `?auth=` existir nas regras.
 */
export async function salvarLoginRtdb(usuario: string, senha: string): Promise<void> {
  const url = await urlRtdb('login')
  const res = await fetch(url, {
    method: 'POST',
    signal: rtdbFetchSignal(),
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      usuario: usuario.trim().toLowerCase(),
      senha,
    }),
  })

  if (!res.ok) {
    const detail = await readRtdbErrorBody(res)
    throw new Error(`Realtime Database (/login): ${res.status} — ${detail}`)
  }
}
