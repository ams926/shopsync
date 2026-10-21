import { dataHoraNumerica, hora, temHora } from "./format"
import { pinDe, diasRestantes } from "./vendas"
import type { ContaServico, Venda } from "./types"

export function numeroWhatsApp(telefone: string): string {
  let n = telefone.replace(/\D/g, "")
  if (n.length <= 9) n = `258${n}`
  return n
}

export function abrirWhatsApp(telefone: string, texto?: string) {
  const n = numeroWhatsApp(telefone)
  const url = texto ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : `https://wa.me/${n}`
  window.open(url, "_blank", "noopener")
}

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || nome

export function mensagemDados(v: Venda, conta: ContaServico | undefined): string {
  const fim = dataHoraNumerica(v.dataExpiracao)
  if (/spotify/i.test(v.servico)) {
    return [
      `Olá ${primeiroNome(v.nomeCliente)}, obrigado pela preferência.`,
      ``,
      `*${v.servico}* — vaga: *${v.perfil}*`,
      `Válido até: *${fim}*`,
      ``,
      `Vai receber um convite do Spotify no seu email. Basta abrir e aceitar com a sua conta.`,
    ].join("\n")
  }
  return [
    `Olá ${primeiroNome(v.nomeCliente)}, obrigado pela preferência.`,
    `Aqui estão os dados do seu acesso *${v.servico}*:`,
    ``,
    `*Email:* ${conta?.email || "—"}`,
    `*Senha:* ${conta?.senha || "—"}`,
    `*Perfil:* ${v.perfil}`,
    `*PIN:* ${pinDe(conta, v.perfil) || "—"}`,
    ``,
    `Válido até *${fim}* (${v.pacote}).`,
    `Por favor, use apenas o seu perfil e não altere a senha.`,
  ].join("\n")
}

export function mensagemCobranca(v: Venda, agora = new Date()): string {
  const dias = diasRestantes(v, agora) ?? 0
  const nome = primeiroNome(v.nomeCliente)
  const fim = dataHoraNumerica(v.dataExpiracao)
  const as = temHora(v.dataExpiracao) ? ` às ${hora(v.dataExpiracao)}` : ""
  if (dias < 0 || (v.dataExpiracao && v.dataExpiracao <= agora)) {
    return `Olá ${nome}! O seu acesso *${v.servico}* (perfil ${v.perfil}) terminou a ${fim}.\n\nQuer renovar para continuar a ver? É só responder a esta mensagem.`
  }
  const prazo = dias === 0 ? `hoje${as}` : dias === 1 ? `amanhã${as}` : `a ${fim}`
  return `Olá ${nome}! Lembrete: o seu acesso *${v.servico}* (perfil ${v.perfil}) termina ${prazo}.\n\nQuer já renovar para não ficar sem acesso?`
}

export function mensagemRecibo(v: Venda): string {
  return `Olá ${primeiroNome(v.nomeCliente)}, segue em anexo o recibo do seu ${v.servico} (${v.pacote}). Obrigado!`
}
