import {
  db,
  firebaseUtils,
  type FirebaseUser,
} from './firebase'
import type { Order } from '../types/order'
import { normalizeOrderStatus } from '../utils/orderLabels'

const ORDERS_COLLECTION = 'orders'

function ordersCollectionRef() {
  return firebaseUtils.collection(db, ORDERS_COLLECTION)
}

export async function createOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>, user: FirebaseUser) {
  const payload = {
    ...order,
    createdBy: user.uid,
    createdAt: firebaseUtils.serverTimestamp(),
    updatedAt: firebaseUtils.serverTimestamp(),
  }

  const docRef = await firebaseUtils.addDoc(ordersCollectionRef(), payload)
  return { ...order, id: docRef.id }
}

export async function updateOrder(id: string, order: Partial<Order>) {
  const ref = firebaseUtils.doc(db, ORDERS_COLLECTION, id)
  await firebaseUtils.updateDoc(ref, {
    ...order,
    updatedAt: firebaseUtils.serverTimestamp(),
  })
}

export async function getOrderById(id: string): Promise<Order | null> {
  const ref = firebaseUtils.doc(db, ORDERS_COLLECTION, id)
  const snap = await firebaseUtils.getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data() as any
  return normalizeOrder(snap.id, data)
}

export async function deleteOrder(id: string): Promise<void> {
  const ref = firebaseUtils.doc(db, ORDERS_COLLECTION, id)
  await firebaseUtils.deleteDoc(ref)
}

export async function listRecentOrders(max: number): Promise<Order[]> {
  const q = firebaseUtils.query(
    ordersCollectionRef(),
    firebaseUtils.orderBy('createdAt', 'desc'),
    firebaseUtils.limit(max),
  )
  const snap = await firebaseUtils.getDocs(q)
  return snap.docs.map((docSnap) =>
    normalizeOrder(docSnap.id, docSnap.data() as any),
  )
}

export async function searchOrdersByCode(code: string): Promise<Order[]> {
  const q = firebaseUtils.query(
    ordersCollectionRef(),
    firebaseUtils.where('code', '==', code),
    firebaseUtils.orderBy('createdAt', 'desc'),
  )
  const snap = await firebaseUtils.getDocs(q)
  return snap.docs.map((docSnap) =>
    normalizeOrder(docSnap.id, docSnap.data() as any),
  )
}

export async function searchOrdersByNumber(number: string): Promise<Order[]> {
  const q = firebaseUtils.query(
    ordersCollectionRef(),
    firebaseUtils.where('number', '==', number),
    firebaseUtils.orderBy('createdAt', 'desc'),
  )
  const snap = await firebaseUtils.getDocs(q)
  return snap.docs.map((docSnap) =>
    normalizeOrder(docSnap.id, docSnap.data() as any),
  )
}

export async function searchOrdersByName(name: string): Promise<Order[]> {
  const end = name + '\uf8ff'
  const q = firebaseUtils.query(
    ordersCollectionRef(),
    firebaseUtils.orderBy('customerName'),
    firebaseUtils.where('customerName', '>=', name),
    firebaseUtils.where('customerName', '<=', end),
  )
  const snap = await firebaseUtils.getDocs(q)
  return snap.docs.map((docSnap) =>
    normalizeOrder(docSnap.id, docSnap.data() as any),
  )
}

function normalizeOrder(id: string, data: any): Order {
  return {
    id,
    code: String(data.code ?? ''),
    customerName: data.customerName ?? '',
    phone: data.phone ?? '',
    email: data.email ?? '',
    brand: data.brand ?? '',
    type: data.type ?? '',
    caseMaterial: data.caseMaterial ?? '',
    dialColor: data.dialColor ?? '',
    strap: data.strap ?? '',
    mechanism: data.mechanism ?? '',
    number: data.number ?? '',
    service: data.service ?? '',
    price: typeof data.price === 'number' ? data.price : Number(data.price ?? 0),
    entryDate: data.entryDate ?? '',
    dueDate: data.dueDate ?? '',
    notes: data.notes ?? '',
    conditions: data.conditions ?? '',
    status: normalizeOrderStatus(data.status),
    formType: data.formType ?? 'loja',
    aceitoTermos:
      typeof data.aceitoTermos === 'boolean' ? data.aceitoTermos : undefined,
    criadoOuModificado:
      typeof data.criadoOuModificado === 'string'
        ? data.criadoOuModificado
        : undefined,
    dataCriadoOuModificado:
      typeof data.dataCriadoOuModificado === 'string'
        ? data.dataCriadoOuModificado
        : undefined,
    createdAt: data.createdAt?.toDate?.() ?? undefined,
    updatedAt: data.updatedAt?.toDate?.() ?? undefined,
    createdBy: data.createdBy,
  }
}

