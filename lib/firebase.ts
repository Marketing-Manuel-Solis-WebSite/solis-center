/**
 * ============================================================================
 * SOLIS OS — FIREBASE CONFIGURATION
 * ============================================================================
 * Inicialización centralizada de Firebase. Un solo punto de entrada.
 * Variables de entorno: NEXT_PUBLIC_FIREBASE_*
 * ============================================================================
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore'
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth'
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions'

// ======================== CONFIG ========================

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// ======================== SINGLETON INIT ========================

let app: FirebaseApp
let db: Firestore
let auth: Auth
let storage: FirebaseStorage
let functions: Functions

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

db = getFirestore(app)
auth = getAuth(app)
storage = getStorage(app)
functions = getFunctions(app)

// ======================== EMULATORS (desarrollo local) ========================

const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true'

if (USE_EMULATORS && typeof window !== 'undefined') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080)
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    connectStorageEmulator(storage, 'localhost', 9199)
    connectFunctionsEmulator(functions, 'localhost', 5001)
    console.log('[Firebase] Emuladores conectados')
  } catch (e) {
    // Ya conectado — ignorar en HMR
  }
}

// ======================== EXPORTS ========================

export { app, db, auth, storage, functions }
export default app
