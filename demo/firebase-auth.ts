// Autenticação falsa para o modo de demonstração.
type Cb = (u: unknown) => void
const params = new URLSearchParams(location.search)
let atual: unknown = params.has("login") ? null : fazerUser(params.get("email") ?? "sinistroglobal926@gmail.com")
const ouvintes = new Set<Cb>()

function fazerUser(email: string) {
  return { email, emailVerified: true, displayName: "Chadreque", photoURL: null, uid: "demo" }
}
function emitir() {
  for (const cb of ouvintes) cb(atual)
}
export function getAuth() {
  return {}
}
export class GoogleAuthProvider {
  setCustomParameters() {}
}
export function onAuthStateChanged(_a: unknown, cb: Cb) {
  ouvintes.add(cb)
  setTimeout(() => cb(atual), 50)
  return () => ouvintes.delete(cb)
}
export async function signInWithPopup() {
  atual = fazerUser(params.get("email") ?? "sinistroglobal926@gmail.com")
  emitir()
  return { user: atual }
}
export const signInWithRedirect = signInWithPopup
export async function signOut() {
  atual = null
  emitir()
}
export type User = ReturnType<typeof fazerUser>
