import { Loader2Icon, ShieldAlertIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/marca"
import { useAuth } from "@/hooks/useAuth"

function IconeGoogle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export function Login() {
  const { estado, entrar, aEntrar } = useAuth()
  const erro = estado.tipo === "fora" ? estado.erro : undefined

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-10">
      {/* recortes de papel ao fundo, com as cores do logótipo */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -left-20 h-56 w-72 rotate-[-14deg] bg-coral/80 [clip-path:polygon(4%_8%,96%_0,100%_88%,0_100%)]" />
        <div className="absolute top-[18%] -right-16 h-40 w-64 rotate-[11deg] bg-azul/85 [clip-path:polygon(0_10%,100%_0,94%_100%,6%_90%)]" />
        <div className="absolute -bottom-10 left-[12%] h-44 w-60 rotate-[7deg] bg-sol [clip-path:polygon(6%_0,100%_12%,92%_100%,0_86%)]" />
        <div className="absolute right-[14%] bottom-[10%] h-24 w-32 rotate-[-9deg] bg-bordo/80 [clip-path:polygon(0_0,100%_8%,96%_100%,4%_92%)]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="tape rounded-2xl border-2 border-ink bg-paper-2 px-6 pt-9 pb-6 stamp-shadow sm:px-8">
          <Logo className="mx-auto h-auto w-full max-w-[260px]" />
          <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            painel de gestão
          </p>

          <div className="my-7 h-px border-t-[1.5px] border-dashed border-ink/25" />

          <Button size="lg" variant="outline" className="w-full bg-white text-[15px]" onClick={() => void entrar()} disabled={aEntrar || estado.tipo === "a-verificar"}>
            {aEntrar ? <Loader2Icon className="animate-spin" /> : <IconeGoogle />}
            Entrar com Google
          </Button>

          {erro && (
            <div role="alert" className="mt-4 flex gap-2.5 rounded-lg border-[1.5px] border-coral-ink bg-coral/10 p-3 text-sm">
              <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-coral-ink" />
              <p>{erro}</p>
            </div>
          )}

          <p className="mt-5 text-center text-xs text-muted-foreground">Acesso reservado à conta da ShopSync.</p>
        </div>
      </div>
    </div>
  )
}
