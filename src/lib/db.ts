import {
  collection,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  addDoc,
} from "firebase/firestore"
import { db } from "./firebase"
import type { ContasMaster, Venda } from "./types"

/** Os campos que o formulário de venda escreve — os mesmos nomes do site antigo. */
export interface DadosVenda {
  nomeCliente: string
  telefone: string
  emailCliente: string
  servico: string
  pacote: string
  perfil: string
  precoMZN: number
  dataRegisto: Date
  dataExpiracao: Date
  status: string
}

export async function criarVenda(dados: DadosVenda): Promise<string> {
  const ref = await addDoc(collection(db, "vendas"), dados)
  return ref.id
}

export async function atualizarVenda(id: string, dados: Partial<DadosVenda>) {
  await updateDoc(doc(db, "vendas", id), dados)
}

export async function apagarVenda(id: string) {
  await deleteDoc(doc(db, "vendas", id))
}

/**
 * Renovação: cria uma venda nova (para a receita contar no mês certo)
 * e marca a antiga como "renovado", ligando as duas.
 */
export async function renovarVenda(antiga: Venda, nova: DadosVenda): Promise<string> {
  const batch = writeBatch(db)
  const novaRef = doc(collection(db, "vendas"))
  batch.set(novaRef, { ...nova, renovadoDe: antiga.id })
  batch.update(doc(db, "vendas", antiga.id), { status: "renovado", renovadoPara: novaRef.id })
  await batch.commit()
  return novaRef.id
}

export async function aprovarVenda(
  id: string,
  dados: { perfil: string; dataRegisto: Date; dataExpiracao: Date; pacote: string; precoMZN: number },
) {
  await updateDoc(doc(db, "vendas", id), { ...dados, status: "ativo" })
}

export async function marcarLembrete(id: string) {
  await updateDoc(doc(db, "vendas", id), { ultimoLembrete: new Date() })
}

export async function guardarContas(contas: ContasMaster) {
  await setDoc(doc(db, "configuracoes", "contasMaster"), contas)
}
