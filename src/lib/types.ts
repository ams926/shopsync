/** Estrutura exatamente igual à que já existe no Firestore. */

export interface Pacote {
  dias: number
  nome: string
  preco: number
}

export interface Perfil {
  nome: string
  pin: string
}

/** Um bloco de `configuracoes/contasMaster`, por exemplo "Netflix" ou "Prime Video". */
export interface ContaServico {
  email: string
  senha: string
  pacotes: Pacote[]
  perfis: Perfil[]
  /** quanto a ShopSync paga por esta conta, em MT por mês (para calcular o lucro) */
  custoMensal?: number
  [outro: string]: unknown
}

export type ContasMaster = Record<string, ContaServico>

/** Um documento da coleção `vendas`. */
export interface Venda {
  id: string
  nomeCliente: string
  telefone: string
  emailCliente: string
  servico: string
  pacote: string
  perfil: string
  precoMZN: number
  status: string
  dataRegisto: Date
  dataExpiracao: Date | null
  diasPacote?: number
  comprovativo?: string
  renovadoPara?: string
  renovadoDe?: string
  /** última vez que o cliente foi lembrado no WhatsApp */
  ultimoLembrete?: Date
  /** campos que não conhecemos ficam guardados aqui e nunca são apagados */
  extra: Record<string, unknown>
}

export type EstadoVenda = "ativo" | "a-expirar" | "expirado" | "pendente" | "renovado"
