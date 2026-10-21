import { useState } from "react"
import { toast } from "sonner"
import { DownloadIcon, Loader2Icon, MessageCircleIcon, Share2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VendaForm } from "@/components/venda-form"
import { IconeServico } from "@/components/marca"
import { useAcoes } from "@/hooks/useAcoes"
import { apagarVenda } from "@/lib/db"
import { data, mt } from "@/lib/format"
import type { Venda } from "@/lib/types"

export function EditarDialog({ venda, onFechar }: { venda: Venda | null; onFechar: () => void }) {
  return (
    <Dialog open={Boolean(venda)} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar venda</DialogTitle>
          <DialogDescription>As alterações ficam guardadas na mesma venda.</DialogDescription>
        </DialogHeader>
        {venda && <VendaForm key={venda.id} inicial={venda} compacto onGuardada={onFechar} />}
      </DialogContent>
    </Dialog>
  )
}

export function ApagarDialog({ venda, onFechar }: { venda: Venda | null; onFechar: () => void }) {
  const [aApagar, setAApagar] = useState(false)
  const confirmar = async () => {
    if (!venda) return
    setAApagar(true)
    try {
      await apagarVenda(venda.id)
      toast.success("Venda apagada")
      onFechar()
    } catch (e) {
      console.error(e)
      toast.error("Não foi possível apagar")
    } finally {
      setAApagar(false)
    }
  }
  return (
    <Dialog open={Boolean(venda)} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apagar esta venda?</DialogTitle>
          <DialogDescription>
            {venda && (
              <>
                {venda.nomeCliente} · {venda.servico} · {venda.pacote}. A venda desaparece da base de dados e deixa de contar na
                receita. Não dá para desfazer.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmar} disabled={aApagar}>
            {aApagar && <Loader2Icon className="animate-spin" />}
            Apagar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Depois de vender ou renovar: enviar dados e recibo ao cliente. */
export function PosVendaDialog({ venda, titulo, onFechar }: { venda: Venda | null; titulo: string; onFechar: () => void }) {
  const { enviarDados, partilhar, baixar } = useAcoes()
  return (
    <Dialog open={Boolean(venda)} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        {venda && (
          <>
            <DialogHeader>
              <p className="cutout w-fit -rotate-1 text-xs uppercase tracking-[0.12em]">feito</p>
              <DialogTitle className="text-2xl">{titulo}</DialogTitle>
              <DialogDescription>Agora envie os dados de acesso e o recibo ao cliente.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
              <IconeServico servico={venda.servico} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{venda.nomeCliente}</p>
                <p className="num truncate text-xs text-ink-soft">
                  {venda.perfil} · até {data(venda.dataExpiracao)}
                </p>
              </div>
              <span className="num font-semibold">{mt(venda.precoMZN)}</span>
            </div>
            <div className="grid gap-2">
              <Button variant="whatsapp" size="lg" onClick={() => enviarDados(venda)}>
                <MessageCircleIcon /> Enviar dados no WhatsApp
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => partilhar(venda)}>
                  <Share2Icon /> Partilhar recibo
                </Button>
                <Button variant="outline" onClick={() => void baixar(venda)}>
                  <DownloadIcon /> Baixar PDF
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
