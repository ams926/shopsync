# Notificações no telemóvel com o painel fechado

## O que vai conseguir

Todas as manhãs às **8h00**, o seu telemóvel recebe um aviso como este, mesmo com o painel fechado:

> **ShopSync · Sílvia Manuel termina hoje**
> 1 termina hoje, 2 amanhã e 1 nos próximos dias. Toque para abrir o painel.

Se nesse dia não houver nada para avisar, não chega nada.

## Como funciona (em 3 frases)

1. Um pequeno programa (chamado **Worker**) fica guardado no Cloudflare, grátis.
2. Todas as manhãs o Cloudflare acorda-o; ele lê as vendas no seu Firebase e vê quem está a terminar.
3. Depois envia o aviso para o telemóvel onde carregou no **sino** do painel.

Para isto funcionar precisa de **2 coisas do Firebase** (uma chave e um ficheiro) e de criar o Worker no Cloudflare. **Não precisa de programar nem de usar o terminal**: é tudo no navegador, copiar e colar.

**Tempo:** cerca de 20 minutos.

---

## Antes de começar

- [ ] O painel novo já está publicado no Cloudflare Pages e consegue entrar com a sua conta Google.
- [ ] Tem a pasta do projeto (`shopsync-gestao`) no computador.
- [ ] Tem o telemóvel à mão.

Se o painel ainda não está publicado, faça isso primeiro (veja o `README.md` principal) e volte aqui.

---

## Parte 1 · A chave do painel (Firebase)

Esta chave permite que o painel registe o seu telemóvel para receber avisos.

1. Abra **https://console.firebase.google.com** e escolha o projeto **shopsync-eb1cf**.
2. No canto superior esquerdo, ao lado de «Visão geral do projeto», carregue na **roda dentada ⚙️** → **Definições do projeto**.
3. Abra o separador **Cloud Messaging**.
4. Desça até **Configuração da Web** → **Certificados de push da Web** (em inglês: *Web Push certificates*).
5. Carregue em **Gerar par de chaves** (*Generate key pair*).
6. Aparece uma chave comprida que começa por **B** (por exemplo `BKx7…`). Carregue no ícone de copiar ao lado dela.

**Agora diga ao painel qual é a chave:**

7. Abra **https://dash.cloudflare.com** → **Workers & Pages** → carregue no projeto do **painel**.
8. Vá a **Settings** (Definições) → **Variables and Secrets** (Variáveis e segredos) → **Add** (Adicionar).
9. Preencha:
   - **Type:** Plaintext (texto normal)
   - **Variable name:** `VITE_FCM_VAPID_KEY`
   - **Value:** cole a chave que copiou
10. Carregue em **Save**.
11. Vá ao separador **Deployments** (Implementações), no topo da lista carregue nos **três pontinhos ⋯** → **Retry deployment**. Espere 1 a 2 minutos até aparecer «Success».

> **Porque é que tenho de voltar a publicar?** O painel só lê a chave quando é publicado. Sem este passo, o sino só funciona com o painel aberto.

✅ **Feito quando:** o painel foi publicado de novo com sucesso.

---

## Parte 2 · O ficheiro de acesso (Firebase)

Este ficheiro deixa o Worker ler as suas vendas.

1. Volte à consola do Firebase → **⚙️ Definições do projeto** → separador **Contas de serviço** (*Service accounts*).
2. Carregue em **Gerar nova chave privada** → **Gerar chave**.
3. É descarregado um ficheiro com um nome parecido com `shopsync-eb1cf-firebase-adminsdk-xxxxx.json`.
4. Abra esse ficheiro com o **Bloco de Notas** (no Windows: botão direito → *Abrir com* → *Bloco de Notas*). Vai ver texto que começa por `{` e acaba em `}`. Deixe-o aberto, vai precisar dele na Parte 3.

> ⚠️ **Muito importante:** este ficheiro é como a chave da sua loja. Quem o tiver pode ler e apagar toda a base de dados.
> - Nunca o envie por WhatsApp ou email, nem o ponha no GitHub.
> - Depois da Parte 3, guarde-o numa pen ou apague-o.
> - Se achar que alguém o viu, volte a este ecrã e apague essa chave.

✅ **Feito quando:** tem o ficheiro aberto no Bloco de Notas.

---

## Parte 3 · Criar o Worker (Cloudflare)

### 3.1 Criar

1. Em **https://dash.cloudflare.com** → **Workers & Pages** → **Create** (Criar).
2. Escolha **Start with Hello World!** (ou «Create Worker»).
3. Em **Worker name**, escreva: `shopsync-push`
4. Carregue em **Deploy**. O Cloudflare cria um Worker de exemplo.

### 3.2 Colar o código

5. Carregue em **Edit code** (Editar código). Abre um editor com algum código de exemplo.
6. No computador, abra a pasta do projeto → `push-worker` → `src` → ficheiro **`index.js`** com o Bloco de Notas.
7. Selecione tudo (**Ctrl + A**) e copie (**Ctrl + C**).
8. No editor do Cloudflare, selecione todo o código de exemplo (**Ctrl + A**), apague-o e cole o seu (**Ctrl + V**).
9. Carregue em **Deploy** (canto superior direito) e confirme.

### 3.3 Dar-lhe os segredos

10. Volte à página do Worker `shopsync-push` → **Settings** → **Variables and Secrets** → **Add**.
11. **Primeiro segredo**, o ficheiro de acesso:
    - **Type:** **Secret** (importante: *Secret*, não *Text*)
    - **Variable name:** `FIREBASE_SERVICE_ACCOUNT`
    - **Value:** no Bloco de Notas da Parte 2, faça **Ctrl + A**, **Ctrl + C** e cole aqui. Tem de colar o texto **todo**, do `{` inicial ao `}` final.
12. Carregue em **Add** outra vez, para o **segundo segredo**, uma palavra-passe de teste:
    - **Type:** **Secret**
    - **Variable name:** `CHAVE_TESTE`
    - **Value:** uma palavra à sua escolha, sem espaços, por exemplo `teste2026shop`. Anote-a.
13. Carregue em **Deploy** / **Save**.

### 3.4 Pôr o despertador (todas as manhãs)

14. Ainda em **Settings**, procure **Trigger Events** (ou *Triggers*) → **Add** → **Cron Triggers**.
15. Escolha a opção de escrever a expressão e escreva exatamente:

    ```
    0 6 * * *
    ```

    Quer dizer «todos os dias às 06:00 UTC», que são as **08:00 em Maputo**.
16. Carregue em **Add** / **Save**.

✅ **Feito quando:** na página do Worker aparecem os 2 segredos e o *cron* `0 6 * * *`.

Já pode **guardar ou apagar** o ficheiro `.json` da Parte 2.

---

## Parte 4 · Ligar o telemóvel

### Android

1. No telemóvel, abra o **painel** no **Chrome** e entre com a sua conta Google.
2. Toque no **sino** (no topo, ao lado da sua foto) e depois em **Permitir**.
3. Deve aparecer a mensagem: **«Vai recebê-las neste aparelho mesmo com o painel fechado»**.

### iPhone (iOS 16.4 ou mais recente)

No iPhone, as notificações só funcionam se o painel estiver instalado como app:

1. Abra o painel no **Safari**.
2. Toque em **Partilhar** (o quadrado com a seta) → **Adicionar ao ecrã principal** → **Adicionar**.
3. Abra o painel **a partir do novo ícone** no ecrã principal e entre.
4. Toque no **sino** → **Permitir**.

> Se aparecer **«…enquanto o painel estiver aberto»** em vez da mensagem acima, a Parte 1 não ficou completa. Veja «Problemas» lá em baixo.

Pode repetir isto noutros aparelhos (outro telemóvel, o computador); todos recebem os avisos.

---

## Parte 5 · Testar agora (sem esperar pelas 8h)

1. **Feche o painel** no telemóvel.
2. No computador, veja o endereço do Worker: na página do `shopsync-push` aparece algo como
   `shopsync-push.o-seu-nome.workers.dev`
3. Abra no navegador este endereço, trocando as duas partes:

   ```
   https://shopsync-push.o-seu-nome.workers.dev/teste?chave=teste2026shop
   ```

   (`o-seu-nome`: o que aparece no seu endereço · `teste2026shop`: a palavra que escolheu no passo 12)

4. Em poucos segundos o telemóvel recebe uma notificação. Se não houver ninguém a terminar, recebe «ShopSync · teste — As notificações estão a funcionar».
5. A página no computador mostra um texto técnico. O que interessa é ver **`"enviado": true`**.

🎉 **Está pronto.** A partir de amanhã, os avisos chegam sozinhos às 8h.

---

## Problemas

| O que vê | O que fazer |
|---|---|
| No telemóvel: «…enquanto o painel estiver aberto» | A chave da Parte 1 não chegou ao painel. Confirme o nome `VITE_FCM_VAPID_KEY` (sem espaços) e faça o **Retry deployment** do passo 11. Depois feche o painel, volte a abrir, toque no sino **duas vezes** (desliga e liga). |
| O sino aparece riscado / «Notificações bloqueadas» | Bloqueou as notificações sem querer. **Android:** Chrome → ⋮ → Definições → Definições de sites → Notificações → encontre o painel → Permitir. **iPhone:** Definições → Notificações → ShopSync → Permitir. |
| No teste: `Chave errada.` | A palavra depois de `?chave=` não é igual à do segredo `CHAVE_TESTE` (maiúsculas contam). |
| No teste: `nenhum aparelho registado no painel` | Falta a Parte 4, ou ela mostrou «…enquanto o painel estiver aberto». |
| No teste: `Google recusou a conta de serviço` | O segredo `FIREBASE_SERVICE_ACCOUNT` está incompleto. Apague-o e volte a criá-lo, colando o ficheiro **inteiro**. |
| No teste: `Unexpected token` ou `JSON` | O mesmo de cima: o texto colado não está completo ou foi alterado. |
| No teste: `Firestore: 403` | A conta de serviço não tem acesso. Gere uma chave nova na Parte 2 e cole-a outra vez. |
| O teste diz `"enviado": true` mas nada chega | No telemóvel, veja se o modo «Não incomodar» / poupança de bateria está ativo. No Android, confirme que as notificações do Chrome estão permitidas. |

Se nada disto resolver, copie o texto que aparece na página de teste e envie-mo.

---

## Mais tarde

**Mudar a hora:** no Worker → Settings → Trigger Events, edite o cron. Conte sempre 2 horas a menos que em Maputo:

| Hora em Maputo | Escreva |
|---|---|
| 07:00 | `0 5 * * *` |
| 08:00 | `0 6 * * *` |
| 09:00 | `0 7 * * *` |
| 08:00 e 17:00 | crie dois: `0 6 * * *` e `0 15 * * *` |

**Deixar de receber num aparelho:** abra o painel nesse aparelho e toque no sino para o desligar.

**Custos:** zero. O Cloudflare oferece 100 000 execuções por dia e este Worker usa 1. O envio de notificações do Firebase é grátis.

---

<details>
<summary>Para quem usa o terminal (opcional)</summary>

Em vez da Parte 3, dentro da pasta `push-worker`:

```bash
npx wrangler login
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT   # cole o ficheiro .json inteiro
npx wrangler secret put CHAVE_TESTE
npx wrangler deploy                                 # já inclui o cron do wrangler.toml
```

</details>
