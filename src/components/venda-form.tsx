import { useEffect, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Loader2Icon, LockIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IconeServico, corServico } from "@/components/marca"
import { Vagas } from "@/components/vagas"
import { useDados } from "@/hooks/useDados"
import { atualizarVenda, criarVenda, type DadosVenda } from "@/lib/db"
import { dataHora, deInputDataHora, mt, paraInputDataHora } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  LIMITE_POR_PERFIL,
  normalizarTelefone,
  ocupacao,
  pacoteDe,
  somarDias,
  telefoneLocal,
} from "@/lib/vendas"
import type { Venda } from "@/lib/types"

interface Props {
  inicial?: Venda
  onGuardada: (v: Venda) => void
  /** dentro de um diálogo: uma só coluna */
  compacto?: boolean
}

const DIA = 86_400_000

function Passo({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-baseline gap-2 text-[15px] font-extrabold">
        <span className="num text-xs text-muted-foreground">0{n}</span>
        {titulo}
      </h3>
      {children}
    </section>
  )
}


export function VendaForm({ inicial, onGuardada, compacto = false }: Props) {
  const { contas, servicos, vendas, agora } = useDados()
  const editar = Boolean(inicial)

  const [servico, setServico] = useState(inicial?.servico ?? servicos[0] ?? "")
  const conta = contas[servico]
  const pacotes = conta?.pacotes ?? []
  const perfis = conta?.perfis ?? []

  const [pacoteNome, setPacoteNome] = useState(inicial?.pacote ?? "")
  const [perfil, setPerfil] = useState(inicial?.perfil ?? "")
  const [nome, setNome] = useState(inicial?.nomeCliente ?? "")
  const [telefone, setTelefone] = useState(inicial ? telefoneLocal(inicial.telefone) : "")
  const [email, setEmail] = useState(inicial?.emailCliente ?? "")
  const [inicio, setInicio] = useState(paraInputDataHora(inicial?.dataRegisto ?? new Date()))
  const [preco, setPreco] = useState(inicial ? String(inicial.precoMZN) : "")
  const [aGuardar, setAGuardar] = useState(false)
  const [tentou, setTentou] = useState(false)

  const ocup = useMemo(() => ocupacao(vendas, servico, agora, inicial?.id), [vendas, servico, agora, inicial?.id])

  // escolhe valores por omissão quando ainda não há nada escolhido
  useEffect(() => {
    if (!servico && servicos[0]) setServico(servicos[0])
  }, [servicos, servico])

  useEffect(() => {
    if (!pacoteNome && pacotes[0]) {
      setPacoteNome(pacotes[0].nome)
      if (!preco) setPreco(String(pacotes[0].preco))
    }
  }, [pacotes, pacoteNome, preco])

  useEffect(() => {
    if (!perfil && perfis.length) {
      const livre = perfis.find((p) => (ocup[p.nome] ?? 0) < LIMITE_POR_PERFIL)
      if (livre) setPerfil(livre.nome)
    }
  }, [perfis, perfil, ocup])

  const trocarServico = (s: string) => {
    if (s === servico) return
    setServico(s)
    const c = contas[s]
    const p0 = c?.pacotes?.[0]
    setPacoteNome(p0?.nome ?? "")
    setPreco(p0 ? String(p0.preco) : "")
    const o = ocupacao(vendas, s, agora, inicial?.id)
    setPerfil(c?.perfis?.find((p) => (o[p.nome] ?? 0) < LIMITE_POR_PERFIL)?.nome ?? "")
  }

  const escolherPacote = (nomeP: string) => {
    setPacoteNome(nomeP)
    const p = pacoteDe(conta, nomeP)
    if (p) setPreco(String(p.preco))
  }

  const pacote = pacoteDe(conta, pacoteNome)
  // uma venda antiga pode ter um pacote que já não existe: usa os dias que ela tinha
  const diasAntigos =
    inicial && inicial.dataExpiracao
      ? Math.max(1, Math.round((inicial.dataExpiracao.getTime() - inicial.dataRegisto.getTime()) / DIA))
      : 30
  const dias = pacote?.dias ?? inicial?.diasPacote ?? diasAntigos
  const dataInicio = deInputDataHora(inicio)
  const dataFim = somarDias(dataInicio, dias)
  const valor = Number(preco.replace(",", ".")) || 0

  const digitos = telefone.replace(/\D/g, "")
  const erros = {
    nome: !nome.trim(),
    telefone: digitos.length < 9,
    pacote: !pacoteNome,
    perfil: !perfil,
  }
  const valido = !Object.values(erros).some(Boolean)

  const guardar = async () => {
    setTentou(true)
    if (!valido) {
      toast.error("Faltam dados", { description: "Preencha o nome, o telefone, o pacote e o perfil." })
      return
    }
    setAGuardar(true)
    const status = inicial?.status === "pendente" || inicial?.status === "renovado" ? inicial.status : "ativo"
    const dados: DadosVenda = {
      nomeCliente: nome.trim(),
      telefone: normalizarTelefone(telefone),
      emailCliente: email.trim(),
      servico,
      pacote: pacoteNome,
      perfil,
      precoMZN: valor,
      dataRegisto: dataInicio,
      dataExpiracao: dataFim,
      status,
    }
    try {
      const id = inicial ? inicial.id : await criarVenda(dados)
      if (inicial) await atualizarVenda(inicial.id, dados)
      toast.success(inicial ? "Alterações guardadas" : "Venda registada")
      onGuardada({ ...(inicial ?? { extra: {} }), ...dados, id } as Venda)
      if (!inicial) {
        setNome("")
        setTelefone("")
        setEmail("")
        setTentou(false)
        setInicio(paraInputDataHora(new Date()))
        setPerfil("")
      }
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível guardar", { description: "Verifique a ligação à internet e tente outra vez." })
    } finally {
      setAGuardar(false)
    }
  }

  if (servicos.length === 0) {
    return (
      <p className="rounded-lg border-2 border-dashed border-ink/30 p-6 text-center text-sm text-muted-foreground">
        Ainda não há serviços configurados. Adicione um em <b>Contas</b>.
      </p>
    )
  }

  return (
    <div className={cn("grid gap-8", !compacto && "lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start")}>
      <div className="space-y-7">
        <Passo n={1} titulo="Serviço">
          <div className="flex flex-wrap gap-2">
            {servicos.map((s) => {
              const ativo = s === servico
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => trocarServico(s)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border-2 py-1.5 pr-4 pl-1.5 text-sm font-bold transition-all",
                    ativo ? "border-ink bg-paper-2 stamp-shadow-sm" : "border-transparent bg-ink/[0.05] text-ink-soft hover:bg-ink/[0.08]",
                  )}
                >
                  <IconeServico servico={s} className="size-8" />
                  {s}
                </button>
              )
            })}
          </div>
        </Passo>

        <Passo n={2} titulo="Pacote">
          {pacotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este serviço ainda não tem pacotes. Crie-os em Contas.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {pacotes.map((p) => {
                const ativo = p.nome === pacoteNome
                return (
                  <button
                    key={p.nome}
                    type="button"
                    onClick={() => escolherPacote(p.nome)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2.5 text-left transition-all",
                      ativo ? "border-ink bg-sol stamp-shadow-sm" : "border-ink/15 bg-paper-2 hover:border-ink/40",
                    )}
                  >
                    <span className="block text-sm font-extrabold">{p.nome}</span>
                    <span className="num block text-[13px] text-ink-soft">{mt(p.preco)}</span>
                  </button>
                )
              })}
            </div>
          )}
          {editar && pacoteNome && !pacote && (
            <p className="text-xs text-muted-foreground">
              Esta venda usa o pacote «{pacoteNome}», que já não existe. Mantém-se com {dias} dias.
            </p>
          )}
          {tentou && erros.pacote && <p className="text-xs font-semibold text-destructive">Escolha um pacote.</p>}
        </Passo>

        <Passo n={3} titulo="Perfil">
          <div className="grid gap-2 sm:grid-cols-2">
            {perfis.map((p) => {
              const usadas = ocup[p.nome] ?? 0
              const cheio = usadas >= LIMITE_POR_PERFIL
              const ativo = p.nome === perfil
              return (
                <button
                  key={p.nome}
                  type="button"
                  disabled={cheio && !ativo}
                  onClick={() => setPerfil(p.nome)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-all",
                    ativo ? "border-ink bg-paper-2 stamp-shadow-sm" : "border-ink/15 bg-paper-2/60 hover:border-ink/40",
                    cheio && !ativo && "cursor-not-allowed opacity-45 hover:border-ink/15",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold">{p.nome}</span>
                    <span className="num flex items-center gap-1 text-xs text-ink-soft">
                      {cheio && !ativo ? (
                        <>
                          <LockIcon className="size-3" /> cheio
                        </>
                      ) : (
                        <>PIN {p.pin}</>
                      )}
                    </span>
                  </span>
                  <Vagas usadas={usadas} destaque={ativo && !cheio} />
                </button>
              )
            })}
          </div>
          {tentou && erros.perfil && <p className="text-xs font-semibold text-destructive">Escolha um perfil com vaga.</p>}
        </Passo>

        <Passo n={4} titulo="Cliente">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Sílvia Manuel"
                autoComplete="off"
                aria-invalid={tentou && erros.nome}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tel">WhatsApp</Label>
              <div className="flex">
                <span className="num inline-flex items-center rounded-l-md border-[1.5px] border-r-0 border-input bg-muted px-2.5 text-sm text-ink-soft">
                  +258
                </span>
                <Input
                  id="tel"
                  inputMode="tel"
                  className="num rounded-l-none"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="84 123 4567"
                  aria-invalid={tentou && erros.telefone}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email <span className="normal-case tracking-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="inicio">Começa a (dia e hora)</Label>
                <button
                  type="button"
                  onClick={() => setInicio(paraInputDataHora(new Date()))}
                  className="text-[12px] font-semibold text-azul-ink hover:underline"
                >
                  Agora
                </button>
              </div>
              <Input
                id="inicio"
                type="datetime-local"
                className="num"
                value={inicio}
                onChange={(e) => e.target.value && setInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preco">Valor pago (MT)</Label>
              <Input id="preco" inputMode="decimal" className="num" value={preco} onChange={(e) => setPreco(e.target.value)} />
            </div>
          </div>
        </Passo>
      </div>

      {/* resumo em forma de bilhete */}
      <aside className={cn(!compacto && "lg:sticky lg:top-6")}>
        <div className="ticket rounded-xl border-2 border-ink bg-paper-2">
          <div className={cn("h-2 rounded-t-[10px]", corServico(servico).barra)} />
          <div className="space-y-3 px-5 pt-4 pb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {editar ? "Editar venda" : "Resumo"}
            </p>
            <div className="flex items-center gap-3">
              <IconeServico servico={servico} />
              <div className="min-w-0">
                <p className="truncate font-extrabold leading-tight">{nome.trim() || "Cliente"}</p>
                <p className="truncate text-sm text-ink-soft">
                  {servico} · {perfil || "sem perfil"}
                </p>
              </div>
            </div>
            <dl className="num grid grid-cols-2 gap-y-1 text-[13px]">
              <dt className="text-muted-foreground">Início</dt>
              <dd className="text-right">{dataHora(dataInicio)}</dd>
              <dt className="text-muted-foreground">Fim</dt>
              <dd className="text-right font-semibold">{dataHora(dataFim)}</dd>
              <dt className="text-muted-foreground">Pacote</dt>
              <dd className="text-right">{pacoteNome || "—"}</dd>
            </dl>
          </div>
          <div className="mx-4 h-px border-t-[1.5px] border-dashed border-ink/25" />
          <div className="flex items-end justify-between px-5 pt-3 pb-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Total</span>
            <span className="num text-2xl font-semibold">{mt(valor)}</span>
          </div>
        </div>
        <Button size="lg" variant="coral" className="mt-4 w-full" onClick={guardar} disabled={aGuardar}>
          {aGuardar && <Loader2Icon className="animate-spin" />}
          {editar ? "Guardar alterações" : "Registar venda"}
        </Button>
      </aside>
    </div>
  )
}
