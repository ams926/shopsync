import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { CopyIcon, EyeIcon, EyeOffIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Cabecalho } from "@/components/shell"
import { IconeServico } from "@/components/marca"
import { Vagas } from "@/components/vagas"
import { useDados } from "@/hooks/useDados"
import { guardarContas } from "@/lib/db"
import { ocupacao } from "@/lib/vendas"
import type { ContaServico } from "@/lib/types"

/** Netflix usa PIN de 4 dígitos e o Prime Video de 5; aceitamos de 4 a 6. */
const PIN_VALIDO = /^\d{4,6}$/

const copiar = async (t: string, o: string) => {
  try {
    await navigator.clipboard.writeText(t)
    toast.success(`${o} copiado`)
  } catch {
    toast.error("Não foi possível copiar")
  }
}

export function Contas() {
  const { contas, servicos } = useDados()
  const [ativo, setAtivo] = useState(servicos[0] ?? "")
  const [novo, setNovo] = useState(false)

  useEffect(() => {
    if (!ativo && servicos[0]) setAtivo(servicos[0])
  }, [servicos, ativo])

  return (
    <>
      <Cabecalho etiqueta="configuração" titulo="Contas">
        <Button variant="outline" onClick={() => setNovo(true)}>
          <PlusIcon /> Novo serviço
        </Button>
      </Cabecalho>

      {servicos.length > 0 && (
        <Tabs value={ativo} onValueChange={setAtivo} className="mb-6">
          <TabsList>
            {servicos.map((s) => (
              <TabsTrigger key={s} value={s}>
                <IconeServico servico={s} className="size-6 border-0 bg-transparent" />
                {s}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {ativo && contas[ativo] && <Editor key={ativo} servico={ativo} conta={contas[ativo]} />}

      <NovoServico
        aberto={novo}
        onFechar={() => setNovo(false)}
        onCriado={(s) => {
          setNovo(false)
          setAtivo(s)
        }}
      />
    </>
  )
}

function Editor({ servico, conta }: { servico: string; conta: ContaServico }) {
  const { contas, vendas, agora } = useDados()
  const [rascunho, setRascunho] = useState<ContaServico>(() => structuredClone(conta))
  const [verSenha, setVerSenha] = useState(false)
  const [aGuardar, setAGuardar] = useState(false)

  const ocup = useMemo(() => ocupacao(vendas, servico, agora), [vendas, servico, agora])
  const alterado = JSON.stringify(rascunho) !== JSON.stringify(conta)

  const set = <K extends keyof ContaServico>(k: K, v: ContaServico[K]) => setRascunho((r) => ({ ...r, [k]: v }))
  const perfis = rascunho.perfis ?? []
  const pacotes = rascunho.pacotes ?? []

  const problemas: string[] = []
  if (!rascunho.email?.trim()) problemas.push("Falta o email da conta.")
  if (perfis.some((p) => !p.nome.trim())) problemas.push("Há perfis sem nome.")
  if (perfis.some((p) => !PIN_VALIDO.test(p.pin))) problemas.push("Cada PIN tem de ter entre 4 e 6 números.")
  if (new Set(perfis.map((p) => p.nome.trim())).size !== perfis.length) problemas.push("Há perfis com o mesmo nome.")
  if (pacotes.some((p) => !p.nome.trim() || !(p.dias > 0))) problemas.push("Cada pacote precisa de nome e de dias.")

  const guardar = async () => {
    if (problemas.length) {
      toast.error("Corrija antes de guardar", { description: problemas[0] })
      return
    }
    setAGuardar(true)
    try {
      await guardarContas({ ...contas, [servico]: rascunho })
      toast.success(`${servico} atualizado`)
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível guardar")
    } finally {
      setAGuardar(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-4 lg:col-span-2">
        <h2 className="text-xl font-extrabold">Acesso da conta</h2>
        <div className="grid gap-4 rounded-xl border-[1.5px] border-ink/80 bg-paper-2 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_200px]">
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email</Label>
            <div className="flex gap-1.5">
              <Input id="c-email" value={rascunho.email ?? ""} onChange={(e) => set("email", e.target.value)} />
              <Button size="icon" variant="ghost" aria-label="Copiar email" onClick={() => copiar(rascunho.email, "Email")}>
                <CopyIcon />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-senha">Senha</Label>
            <div className="flex gap-1.5">
              <Input
                id="c-senha"
                type={verSenha ? "text" : "password"}
                className="num"
                value={rascunho.senha ?? ""}
                onChange={(e) => set("senha", e.target.value)}
              />
              <Button size="icon" variant="ghost" aria-label={verSenha ? "Esconder senha" : "Mostrar senha"} onClick={() => setVerSenha((x) => !x)}>
                {verSenha ? <EyeOffIcon /> : <EyeIcon />}
              </Button>
              <Button size="icon" variant="ghost" aria-label="Copiar senha" onClick={() => copiar(rascunho.senha, "Senha")}>
                <CopyIcon />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2 xl:col-span-1">
            <Label htmlFor="c-custo">Custo da conta (MT / mês)</Label>
            <Input
              id="c-custo"
              inputMode="decimal"
              className="num"
              placeholder="0"
              value={rascunho.custoMensal ? String(rascunho.custoMensal) : ""}
              onChange={(e) => set("custoMensal", Number(e.target.value.replace(",", ".").replace(/[^\d.]/g, "")) || 0)}
            />
            <p className="text-[11px] text-muted-foreground">Quanto paga por esta conta. Serve para calcular o lucro.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Perfis</h2>
          <Button size="sm" variant="outline" onClick={() => set("perfis", [...perfis, { nome: "", pin: "" }])}>
            <PlusIcon /> Perfil
          </Button>
        </div>
        <div className="divide-y-[1.5px] divide-dashed divide-ink/15 rounded-xl border-[1.5px] border-ink/80 bg-paper-2">
          {perfis.map((p, i) => {
            const usadas = ocup[conta.perfis?.[i]?.nome ?? p.nome] ?? 0
            return (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_92px_auto_auto] items-center gap-2 p-2.5">
                <Input
                  aria-label="Nome do perfil"
                  value={p.nome}
                  placeholder="Nome"
                  onChange={(e) => set("perfis", perfis.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                />
                <Input
                  aria-label="PIN"
                  className="num text-center tracking-[0.2em]"
                  inputMode="numeric"
                  maxLength={6}
                  value={p.pin}
                  placeholder="0000"
                  onChange={(e) =>
                    set("perfis", perfis.map((x, j) => (j === i ? { ...x, pin: e.target.value.replace(/\D/g, "") } : x)))
                  }
                />
                <Vagas usadas={usadas} className="px-1" />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remover perfil"
                  disabled={usadas > 0}
                  title={usadas > 0 ? "Tem clientes ativos neste perfil" : "Remover"}
                  onClick={() => set("perfis", perfis.filter((_, j) => j !== i))}
                >
                  <Trash2Icon />
                </Button>
              </div>
            )
          })}
          {perfis.length === 0 && <p className="p-4 text-sm text-muted-foreground">Sem perfis.</p>}
        </div>
        <p className="text-xs text-muted-foreground">
          Mudar o nome de um perfil não altera as vendas antigas, que continuam com o nome anterior.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Pacotes e preços</h2>
          <Button size="sm" variant="outline" onClick={() => set("pacotes", [...pacotes, { nome: "", dias: 30, preco: 0 }])}>
            <PlusIcon /> Pacote
          </Button>
        </div>
        <div className="rounded-xl border-[1.5px] border-ink/80 bg-paper-2">
          <div className="grid grid-cols-[minmax(0,1fr)_70px_96px_auto] gap-2 px-2.5 pt-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <span>Nome</span>
            <span>Dias</span>
            <span>Preço MT</span>
            <span className="w-9" />
          </div>
          <div className="divide-y-[1.5px] divide-dashed divide-ink/15">
            {pacotes.map((p, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_70px_96px_auto] items-center gap-2 p-2.5">
                <Input
                  aria-label="Nome do pacote"
                  value={p.nome}
                  onChange={(e) => set("pacotes", pacotes.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                />
                <Input
                  aria-label="Dias"
                  className="num"
                  inputMode="numeric"
                  value={String(p.dias)}
                  onChange={(e) =>
                    set("pacotes", pacotes.map((x, j) => (j === i ? { ...x, dias: Number(e.target.value.replace(/\D/g, "")) || 0 } : x)))
                  }
                />
                <Input
                  aria-label="Preço"
                  className="num"
                  inputMode="decimal"
                  value={String(p.preco)}
                  onChange={(e) =>
                    set(
                      "pacotes",
                      pacotes.map((x, j) => (j === i ? { ...x, preco: Number(e.target.value.replace(",", ".").replace(/[^\d.]/g, "")) || 0 } : x)),
                    )
                  }
                />
                <Button size="icon" variant="ghost" aria-label="Remover pacote" onClick={() => set("pacotes", pacotes.filter((_, j) => j !== i))}>
                  <Trash2Icon />
                </Button>
              </div>
            ))}
            {pacotes.length === 0 && <p className="p-4 text-sm text-muted-foreground">Sem pacotes.</p>}
          </div>
        </div>
      </section>

      {/* barra de guardar: só aparece quando há alterações */}
      {alterado && (
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-xl border-2 border-ink bg-sol p-3 stamp-shadow lg:bottom-6">
          <p className="flex-1 text-sm font-bold">
            {problemas.length ? problemas[0] : "Tem alterações por guardar."}
          </p>
          <Button variant="outline" size="sm" onClick={() => setRascunho(structuredClone(conta))}>
            Desfazer
          </Button>
          <Button size="sm" onClick={guardar} disabled={aGuardar}>
            {aGuardar && <Loader2Icon className="animate-spin" />}
            Guardar
          </Button>
        </div>
      )}
    </div>
  )
}

function NovoServico({ aberto, onFechar, onCriado }: { aberto: boolean; onFechar: () => void; onCriado: (s: string) => void }) {
  const { contas } = useDados()
  const [nome, setNome] = useState("")
  const [aGuardar, setAGuardar] = useState(false)
  const existe = Object.keys(contas).some((k) => k.toLowerCase() === nome.trim().toLowerCase())

  const criar = async () => {
    const n = nome.trim()
    if (!n || existe) return
    setAGuardar(true)
    try {
      await guardarContas({ ...contas, [n]: { email: "", senha: "", pacotes: [], perfis: [] } })
      setNome("")
      onCriado(n)
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível criar")
    } finally {
      setAGuardar(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo serviço</DialogTitle>
          <DialogDescription>Depois de criar, preencha o email, a senha, os perfis e os pacotes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="novo-servico">Nome</Label>
          <Input id="novo-servico" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Disney+" />
          {existe && <p className="text-xs font-semibold text-destructive">Já existe um serviço com este nome.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={criar} disabled={!nome.trim() || existe || aGuardar}>
            {aGuardar && <Loader2Icon className="animate-spin" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
