import { Cabecalho } from "@/components/shell"
import { VendaForm } from "@/components/venda-form"
import { useAcoes } from "@/hooks/useAcoes"

export function Vender() {
  const { posVenda } = useAcoes()
  return (
    <>
      <Cabecalho etiqueta="balcão" titulo="Nova venda" />
      <VendaForm onGuardada={(v) => posVenda(v)} />
    </>
  )
}
