import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth"
import { FirebaseError } from "firebase/app"
import { ADMIN_EMAIL, auth, googleProvider } from "@/lib/firebase"

type Estado =
  | { tipo: "a-verificar" }
  | { tipo: "fora"; erro?: string }
  | { tipo: "dentro"; user: User }

interface AuthCtx {
  estado: Estado
  entrar: () => Promise<void>
  sair: () => Promise<void>
  aEntrar: boolean
}

const Ctx = createContext<AuthCtx | null>(null)

function autorizado(u: User) {
  return u.emailVerified && (u.email ?? "").toLowerCase() === ADMIN_EMAIL
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "a-verificar" })
  const [aEntrar, setAEntrar] = useState(false)
  const recusa = useRef<string | undefined>(undefined)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setEstado({ tipo: "fora", erro: recusa.current })
        recusa.current = undefined
        return
      }
      if (autorizado(u)) {
        setEstado({ tipo: "dentro", user: u })
        return
      }
      // conta Google errada: termina a sessão de imediato
      recusa.current = `A conta ${u.email ?? "escolhida"} não tem acesso a este painel.`
      await signOut(auth)
    })
  }, [])

  const entrar = useCallback(async () => {
    setAEntrar(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      const codigo = e instanceof FirebaseError ? e.code : ""
      if (codigo === "auth/popup-blocked" || codigo === "auth/operation-not-supported-in-this-environment") {
        await signInWithRedirect(auth, googleProvider)
        return
      }
      if (codigo !== "auth/popup-closed-by-user" && codigo !== "auth/cancelled-popup-request") {
        const msg =
          codigo === "auth/unauthorized-domain"
            ? "Este endereço ainda não está autorizado no Firebase (Authentication > Settings > Authorized domains)."
            : codigo === "auth/operation-not-allowed"
              ? "O início de sessão com Google não está ativo no Firebase (Authentication > Sign-in method)."
              : "Não foi possível entrar. Tente outra vez."
        setEstado({ tipo: "fora", erro: msg })
      }
    } finally {
      setAEntrar(false)
    }
  }, [])

  const sair = useCallback(async () => {
    await signOut(auth)
  }, [])

  return <Ctx.Provider value={{ estado, entrar, sair, aEntrar }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error("useAuth fora do AuthProvider")
  return c
}
