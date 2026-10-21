# ShopSync · Gestão

Painel de gestão das vendas de streaming (Netflix, Prime Video e outros) da ShopSync.
Usa **a mesma base de dados Firestore** do site antigo: as coleções `vendas` e `configuracoes/contasMaster` não mudam de estrutura.

Feito com React, Vite, Tailwind CSS, shadcn/ui e ícones Lucide.

---

## O que faz

| Página | Para quê |
| --- | --- |
| **Painel** | Receita do mês, clientes ativos, quem termina nos próximos 3 dias, pedidos pendentes, vagas livres por perfil e receita dos últimos 6 meses. |
| **Nova venda** | Escolher serviço, pacote e perfil (mostra as vagas: no máximo 3 clientes por perfil), dados do cliente e valor pago. O início tem **dia e hora** (por omissão, a hora atual); o fim fica à mesma hora. |
| **Vendas** | Lista com pesquisa e filtros (ativas, a expirar, expiradas, pendentes, já renovadas). Cada venda tem: Renovar, Enviar dados no WhatsApp, Lembrar/cobrar, Partilhar recibo, Baixar recibo PDF, Editar e Apagar. |
| **Clientes** | Todas as vendas agrupadas por cliente (pelo telefone), com o total gasto e o histórico. |
| **Relatórios** | Receita e lucro por serviço, ritmo do mês, renovações, clientes novos vs. que voltam, pacotes vendidos, ocupação dos perfis e melhores clientes. Período: este mês, 3 meses ou 12 meses. Cada gráfico tem vista em tabela. |
| **Contas** | Email, senha, perfis/PINs, pacotes/preços e **custo mensal** de cada conta (para calcular o lucro). |

### Cobrança do dia

No Painel, o botão **«Cobrança do dia»** abre a lista de quem termina nos próximos 3 dias ou terminou há pouco. Cada toque em «Enviar» abre o WhatsApp do cliente com a mensagem pronta (pode editá-la) e passa ao seguinte. Quem já foi lembrado hoje fica marcado (campo `ultimoLembrete` na venda).

### Exportar Excel

Em **Vendas** ou **Relatórios** → «Excel». O ficheiro tem três folhas: *Vendas*, *Clientes* e *Resumo mensal* (receita por serviço, custos e lucro dos últimos 12 meses).

### Como funciona a renovação

Renovar cria **uma venda nova** (para a receita contar no mês em que o cliente pagou) e marca a antiga com `status: "renovado"`, ligando as duas (`renovadoPara` / `renovadoDe`).
Se o cliente ainda tiver dias, pode escolher **somar ao tempo que falta** ou **começar hoje**.

### Recibos e WhatsApp

- O recibo PDF é desenhado diretamente (A5), com o logótipo, os dados de acesso e o total.
- **No telemóvel**, «Partilhar recibo» abre a folha de partilha do sistema, onde aparece o WhatsApp.
- **No computador**, o WhatsApp não aceita anexos por link: o PDF é descarregado e abre-se a conversa do cliente com a mensagem já escrita. Basta arrastar o ficheiro para lá.

### Alertas e notificações

- **Avisos dentro do painel (toasts):** ao abrir, aparece o resumo de quem termina nos próximos 3 dias e dos pedidos pendentes, com o botão «Ver». Enquanto o painel está aberto, avisa também quando alguém passa a terminar hoje e quando entra um pedido novo.
- **Notificações do sistema:** carregue no sino («Ativar notificações», no menu) e aceite. Os mesmos avisos passam a aparecer no telemóvel/computador **enquanto o painel estiver aberto**, mesmo minimizado ou noutro separador. O resumo diário só aparece uma vez por dia.
- **Notificações push com o site fechado:** todas as manhãs, um pequeno serviço grátis no Cloudflare envia o resumo do dia para o telemóvel. Instalação passo a passo em [`push-worker/README.md`](push-worker/README.md).

---

## Correr no seu computador

Precisa do [Node.js](https://nodejs.org) (versão 20 ou mais recente).

```bash
npm install
npm run dev
```

Abra o endereço que aparecer (normalmente http://localhost:5173).

### Modo de demonstração

```bash
npm run demo
```

Abre o painel com **dados de exemplo** e sem login, sem tocar na base de dados real. Bom para experimentar.
(Abra `http://localhost:5173/?login` para ver o ecrã de entrada.)

---

## Publicar no Cloudflare Pages (passo a passo)

1. **GitHub:** crie um repositório novo (por exemplo `shopsync-gestao`) e envie esta pasta.
2. **Cloudflare** → Workers & Pages → Create → Pages → *Connect to Git* → escolha o repositório.
3. Configuração da compilação:
   - Framework preset: **Vite** (ou *None*)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Em *Environment variables*, acrescente `NODE_VERSION` = `22`
4. Depois da primeira publicação, em **Custom domains**, acrescente um subdomínio de teste, por exemplo `gestao.seudominio.com`.

## Configurar o Firebase (uma vez)

Na [consola do Firebase](https://console.firebase.google.com) → projeto **shopsync-eb1cf**:

1. **Authentication → Sign-in method → Google → Ativar.**
2. **Authentication → Settings → Authorized domains → Add domain:** acrescente
   - o endereço `….pages.dev` que o Cloudflare lhe deu;
   - o seu subdomínio (por exemplo `gestao.seudominio.com`).
   (`localhost` já vem autorizado.)

### Só uma conta pode entrar

O painel aceita apenas a conta Google **sinistroglobal926@gmail.com**. Qualquer outra conta é recusada e a sessão é terminada de imediato.
Para trocar de conta, defina `VITE_ADMIN_EMAIL` (veja `.env.example`) e mude também o email no ficheiro `firestore.rules`.

### Proteger a base de dados (quando largar o site antigo)

O bloqueio no ecrã de entrada não chega sozinho: quem protege os dados são as **regras do Firestore**.
O ficheiro `firestore.rules` só deixa a sua conta ler e escrever.

> **Atenção:** quando publicar estas regras, a loja antiga (`loja.html`) deixa de funcionar, porque deixa de conseguir ler os preços e criar pedidos. Publique-as quando o site antigo deixar de ser usado.

Para publicar: Firestore Database → **Rules** → cole o conteúdo de `firestore.rules` → **Publish**.

---

## Onde mexer

| Quero mudar… | Ficheiro |
| --- | --- |
| Cores e tipos de letra | `src/index.css` (as letras vêm incluídas no projeto: Bricolage Grotesque e IBM Plex Mono) |
| Limite de clientes por perfil, dias de aviso | `src/lib/vendas.ts` (`LIMITE_POR_PERFIL`, `DIAS_AVISO`) |
| Textos das mensagens de WhatsApp | `src/lib/whatsapp.ts` |
| Aspeto do recibo PDF | `src/lib/recibo.ts` (letras em `src/assets/fontes`) |
| Logótipo | `src/assets/shopsync-logo.png` |

Para acrescentar componentes shadcn/ui: `npx shadcn@latest add <componente>`.
