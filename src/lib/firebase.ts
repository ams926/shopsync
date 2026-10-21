import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Os mesmos dados do site antigo — é a mesma base de dados.
// (Estas chaves do Firebase são públicas por natureza; quem protege os dados são as regras do Firestore.)
const firebaseConfig = {
  apiKey: "AIzaSyDawFRwy86-BlypCso-3U2oc0ffrRORjLw",
  authDomain: "shopsync-eb1cf.firebaseapp.com",
  projectId: "shopsync-eb1cf",
  storageBucket: "shopsync-eb1cf.firebasestorage.app",
  messagingSenderId: "725614316218",
  appId: "1:725614316218:web:bf503b548b3df04ac91083",
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: "select_account" })

/** A única conta Google que pode entrar. Pode trocar no ficheiro .env (VITE_ADMIN_EMAIL). */
export const ADMIN_EMAIL = String(import.meta.env.VITE_ADMIN_EMAIL || "sinistroglobal926@gmail.com")
  .trim()
  .toLowerCase()
