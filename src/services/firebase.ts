import { initializeApp } from 'firebase/app'
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import {
  getFirestore,
  serverTimestamp,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
} from 'firebase/firestore'

// As credenciais reais devem ser definidas nas variáveis de ambiente Vite:
// VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, etc.
// Veja o README para o passo a passo de configuração no console do Firebase.

/** Mesma instância usada em REST (`realtimeDatabase.ts`). Necessário para `getDatabase`. */
const RTDB_DATABASE_URL =
  import.meta.env.VITE_FIREBASE_DATABASE_URL ??
  'https://relojoaria-aprigio-cad-cli-default-rtdb.firebaseio.com'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: RTDB_DATABASE_URL,
}

function assertFirebaseConfig() {
  const missing: string[] = []
  if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY')
  if (!firebaseConfig.authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN')
  if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID')
  if (!firebaseConfig.storageBucket)
    missing.push('VITE_FIREBASE_STORAGE_BUCKET')
  if (!firebaseConfig.messagingSenderId)
    missing.push('VITE_FIREBASE_MESSAGING_SENDER_ID')
  if (!firebaseConfig.appId) missing.push('VITE_FIREBASE_APP_ID')

  if (missing.length > 0) {
    // Lança um erro mais amigável em vez do "auth/invalid-api-key"
    throw new Error(
      `Configuração do Firebase ausente. Defina as variáveis no arquivo .env.local: ${missing.join(
        ', ',
      )}`,
    )
  }
}

assertFirebaseConfig()

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
/** Realtime Database (SDK) — contador `ordemServicoCounter`, mesmas regras que `clientes`. */
export const rtdb = getDatabase(app)

export const firebaseUtils = {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  serverTimestamp,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
}

export type FirebaseUser = User

