# Encompasso

Aplicacao web para controle de materiais, pedidos, estoque por companheiro e repasses financeiros de materiais de NA. O projeto esta publicado em:

- Aplicacao: https://encompasso.vercel.app/
- Repositorio: https://github.com/christian-goncalves/materiais-evento-v1
- Base atual: Google Sheets `materiais-evento`

## Visao geral

O Encompasso e uma aplicacao estatica em HTML/CSS/JavaScript com funcoes serverless na Vercel. A interface permite consultar resumo, cadastrar/editar pedidos, registrar movimentos de estoque e gerar PDF localmente no navegador. A persistencia oficial nao e banco SQL: os dados sao lidos e escritos em uma Google Sheet por API routes server-side.

Fluxo principal:

```text
Usuario
  -> index.html
  -> /api/*
  -> Service Account Google
  -> Google Sheets
```

Nao ha autenticacao de usuario implementada na aplicacao. Quem acessa a URL publica consegue usar a interface; a protecao real dos dados fica nas credenciais server-side e nas permissoes da planilha.

## Stack

- Frontend: HTML, CSS e JavaScript puro em `materiais-evento-v1/index.html`.
- Backend: Vercel Serverless Functions em JavaScript ESM.
- Runtime local auditado: Node.js `20.20.2` via `.tools/node`.
- Runtime Vercel identificado: Node.js `24.x`.
- Package manager: npm.
- Deploy: Vercel, projeto `encompasso`.
- Persistencia: Google Sheets API v4.
- Autenticacao Google: Service Account com JWT OAuth.
- Bibliotecas de navegador via CDN: `jspdf` e `jspdf-autotable`.

## Estrutura do repositorio

```text
encompasso/
├── api/                         # Wrappers usados pela Vercel na raiz
├── materiais-evento-v1/
│   ├── index.html               # Aplicacao frontend
│   ├── api/                     # Implementacao real dos handlers
│   │   ├── _sheets.js           # OAuth + chamadas Google Sheets
│   │   ├── _inventory.js        # Regras de estoque e normalizacao
│   │   ├── materiais.js
│   │   ├── pedidos.js
│   │   ├── companheiros.js
│   │   ├── estoque/
│   │   ├── financeiro.js
│   │   └── admin/
│   ├── data/                    # Dados/prints de referencia
│   ├── docs/spec/               # Contratos, diagnosticos e plano manual
│   ├── scripts/                 # Scripts PowerShell de apoio
│   └── vercel.json              # Configuracao historica/subpasta
├── vercel.json                  # Configuracao efetiva do deploy raiz
├── package.json
├── .env.example
└── README.md
```

Diretorios locais como `.tools/`, `.vercel/`, `.vscode/` e arquivos `.env*` nao devem ser enviados ao GitHub.

## Arquitetura e APIs

`vercel.json` na raiz redireciona:

- `/` e rotas frontend para `materiais-evento-v1/index.html`;
- `/api/*` para os wrappers em `api/`;
- `/api/financeiro/:id/repasse` para o handler dinamico.

Endpoints confirmados pelo codigo:

| Endpoint | Metodo | Funcao |
|---|---:|---|
| `/api/materiais` | GET | Lista materiais ativos da aba `materiais`. |
| `/api/pedidos` | GET | Reconstrui pedidos a partir de `pedidos`, `pedido_itens` e `estoque`. |
| `/api/pedidos` | PUT | Regrava pedidos, itens e movimentos `saida_pedido`. |
| `/api/companheiros` | GET | Lista companheiros e cria seed inicial se a aba estiver vazia. |
| `/api/estoque/resumo` | GET | Calcula saldo global e por companheiro. |
| `/api/estoque/entrada` | POST | Registra entrada, ajuste, transferencia ou venda por companheiro. |
| `/api/estoque/transferencia` | POST | Transfere estoque para companheiro. |
| `/api/estoque/venda-companheiro` | POST | Registra venda e lancamento financeiro pendente. |
| `/api/financeiro` | GET | Lista lancamentos financeiros. |
| `/api/financeiro/:id/repasse` | PATCH | Marca lancamento como `repassado`. |
| `/api/admin/truncate-transacional` | POST | Limpa ranges transacionais; use somente com extremo cuidado. |

## Pre-requisitos

- Node.js compativel com Vercel Functions.
- npm.
- Vercel CLI para execucao local fiel ao deploy.
- Conta Vercel ou acesso ao projeto atual.
- Acesso a Google Sheet usada como base.
- Projeto Google Cloud com Google Sheets API habilitada.
- Service Account com permissao de edicao na planilha.

## Instalacao

```bash
git clone https://github.com/christian-goncalves/materiais-evento-v1.git
cd materiais-evento-v1
npm install
```

O `package.json` atual nao declara dependencias de aplicacao nem scripts de teste/build. O frontend usa CDNs no navegador e os handlers usam APIs nativas do Node/Vercel.

## Variaveis de ambiente

Crie um `.env.local` local ou configure as mesmas variaveis na Vercel. Use somente placeholders em arquivos versionados:

```env
GSHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

| Variavel | Obrigatoria | Servidor/navegador | Secreta | Finalidade | Onde obter |
|---|---:|---|---:|---|---|
| `GSHEETS_SPREADSHEET_ID` | Sim | Servidor | Sim | ID da planilha usada pela API. | URL da Google Sheet. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Sim | Servidor | Sim | E-mail da Service Account que acessa a planilha. | Google Cloud IAM. |
| `GOOGLE_PRIVATE_KEY` | Sim | Servidor | Sim | Chave privada usada para assinar o JWT OAuth. | JSON de chave da Service Account. |

`GOOGLE_PRIVATE_KEY` deve ser configurada com quebras de linha escapadas como `\n`; o codigo converte `\\n` para quebras reais em runtime.

Durante a auditoria foi encontrado `GOOGLE_PRIVATE_URL` no `.env.local`, mas nao foi encontrado uso dessa variavel no codigo.

## Executando localmente

O modo local recomendado pelos documentos do projeto e `vercel dev`, porque as APIs dependem do formato de functions da Vercel:

```bash
npm install -g vercel
vercel dev
```

Endereco local esperado: o padrao da Vercel CLI costuma ser `http://localhost:3000`; documentos antigos do projeto citam validacao em `http://localhost:3010`.

Nao confirmado durante a auditoria: execucao local completa com credenciais atuais. A auditoria evitou expor ou copiar secrets.

## Build e validacao

Comandos existentes no `package.json`:

```bash
npm run deploy:git
npm run deploy:prod
```

Nao existem scripts de `test`, `lint`, `typecheck` ou `build` no `package.json`.

Validacoes realizadas na auditoria:

```bash
node --check api/**/*.js
node --check materiais-evento-v1/api/**/*.js
curl -I https://encompasso.vercel.app/
```

Resultado:

- Sintaxe dos handlers JavaScript: OK.
- URL publica: HTTP 200.
- Endpoints GET de producao consultados: `/api/materiais`, `/api/pedidos`, `/api/estoque/resumo`.
- `vercel build` sem `--yes` nao executou porque faltavam settings locais de projeto; a CLI sugeriu `vercel pull --yes`, mas isso nao foi executado para evitar alterar configuracoes locais durante a auditoria.

## Google Sheets - base de dados

A Google Sheet atual se chama `materiais-evento`, locale `pt_BR`, timezone `America/Sao_Paulo`.

Abas confirmadas na planilha e no codigo:

| Aba | Colunas usadas |
|---|---|
| `materiais` | `id`, `nome`, `emoji`, `preco`, `ativo`, `estoque_minimo` |
| `companheiros` | `id`, `nome`, `ativo`, `created_at` |
| `pedidos` | `id`, `nome`, `telefone`, `status_pagamento`, `created_at` |
| `pedido_itens` | `id`, `pedido_id`, `material_id`, `quantidade`, `preco` |
| `estoque` | `id`, `material_id`, `tipo`, `quantidade`, `origem`, `created_at`, `companheiro_id`, `destino_tipo` |
| `financeiro` | `id`, `tipo`, `origem_tipo`, `origem_id`, `companheiro_id`, `material_id`, `quantidade`, `valor_unitario`, `valor_total`, `status_repasse`, `created_at` |

Cuidados:

- Nao renomear abas ou colunas sem atualizar os handlers.
- Nao apagar cabecalhos.
- Nao editar manualmente IDs sem entender as regras de saldo.
- `PUT /api/pedidos` limpa e regrava `pedidos!A2:E`, `pedido_itens!A2:E` e `estoque!A2:H`, preservando movimentos que nao sao `saida_pedido`.
- `companheiros` pode receber seed inicial via `GET /api/companheiros` se estiver vazia.
- Ja existe diagnostico de saldo negativo historico em `materiais-evento-v1/docs/spec/diagnostico-regras-venda-estoque-2026-07-31.md`.

## Google Cloud e autenticacao Google

O codigo nao usa OAuth de usuario nem API key para a planilha. Ele usa Service Account:

1. `api/_sheets.js` le as variaveis de ambiente.
2. Monta um JWT com escopo `https://www.googleapis.com/auth/spreadsheets`.
3. Assina com `GOOGLE_PRIVATE_KEY`.
4. Troca o JWT por access token em `https://oauth2.googleapis.com/token`.
5. Chama a Google Sheets API v4.

Para transferir para outro responsavel:

1. Criar ou selecionar um projeto no Google Cloud.
2. Habilitar a Google Sheets API.
3. Criar uma Service Account.
4. Criar uma chave da Service Account.
5. Configurar `GOOGLE_SERVICE_ACCOUNT_EMAIL` e `GOOGLE_PRIVATE_KEY`.
6. Compartilhar a Google Sheet com o e-mail da Service Account com permissao de editor.
7. Configurar `GSHEETS_SPREADSHEET_ID`.
8. Repetir as variaveis na Vercel.
9. Validar leitura e escrita com endpoints controlados.

Compartilhar a planilha com uma pessoa nao substitui a Service Account usada pela aplicacao. A aplicacao precisa que a Service Account configurada tenha permissao na planilha.

## Vercel

Projeto identificado:

- Nome: `encompasso`
- Project ID: `prj_HjYxZAVwcZ3CBPU0aBC3D1DCdEFN`
- Team/Org ID: `team_gDRTtDILR5B5IHZMUDhhTsvb`
- Framework detectado: `null`
- Node: `24.x`
- URL publica principal: https://encompasso.vercel.app/
- Ultimo deployment observado: `dpl_HPgqBrUmdUAM5qF3uiJrahHi5zm2`
- Estado do ultimo deployment: `READY`

Dominios listados pela Vercel:

- `encompasso.vercel.app`
- `encompasso-christian-goncalves-projects.vercel.app`
- `encompasso-christian-goncalves-christian-goncalves-projects.vercel.app`

Variaveis configuradas por nome:

- `GSHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

Atencao: durante a auditoria, Preview apareceu como `Sensitive`, mas Development e Production apareceram como `Non-sensitive` na listagem da Vercel CLI. Recomenda-se recriar essas variaveis como sensiveis e rotacionar credenciais no handoff.

## Deploy

Fluxo confirmado nesta auditoria:

```text
commit local -> push para origin/main -> Vercel production deployment
```

O ultimo deploy havia sido feito pela CLI e ficou ativo em producao. Nao foi executado novo deploy durante esta auditoria.

Para novo responsavel recriar em outra conta Vercel:

1. Importar o repositorio GitHub na Vercel.
2. Usar a raiz do repositorio como root directory.
3. Manter `framework = Other` ou equivalente automatico sem framework.
4. Garantir que `vercel.json` da raiz esteja presente.
5. Configurar as tres variaveis de ambiente.
6. Fazer deploy.
7. Validar `/`, `/api/materiais` e uma escrita controlada em ambiente de teste.

## Git e GitHub

Estado auditado:

- Branch: `main`
- Remote: `origin` -> `https://github.com/christian-goncalves/materiais-evento-v1.git`
- `main` local alinhado com `origin/main` antes da criacao deste README.
- Havia arquivos locais nao rastreados: `.codex`, `.tools/`, `.vscode/`.

Fluxo basico de continuidade:

```bash
git status
git add README.md .env.example
git commit -m "docs: adiciona handoff tecnico"
git push origin main
```

Nao execute `git add .` sem revisar o status, porque ha diretorios locais que nao devem entrar no repositorio.

## Seguranca

- Nunca versionar `.env`, `.env.local`, chaves JSON, tokens ou credenciais.
- Nunca publicar `GOOGLE_PRIVATE_KEY`.
- Rotacionar credenciais antigas se houve exposicao em maquina, historico local ou documentos antigos.
- Garantir que variaveis sensiveis estejam marcadas como Sensitive na Vercel.
- Restringir acesso de edicao da Google Sheet ao menor grupo necessario.
- O endpoint `/api/admin/truncate-transacional` limpa ranges transacionais quando chamado sem `dry_run=true`; nao expor nem acionar sem backup e autorizacao explicita.

Arquivos de seguranca existentes:

- `seguranca-predeploy-checklist.md`
- `seguranca-predeploy-relatorio.md`

Esses arquivos registram riscos historicos de credenciais locais e recomendam rotacao.

## Handoff para novo responsavel

Checklist:

- [ ] Clonar o repositorio.
- [ ] Revisar `README.md`, `materiais-evento-v1/docs/spec/contratos-dados.md` e diagnosticos em `docs/spec/`.
- [ ] Instalar Node/npm e Vercel CLI.
- [ ] Obter acesso de leitura/edicao a Google Sheet `materiais-evento`.
- [ ] Criar projeto Google Cloud proprio ou receber um projeto transferido.
- [ ] Habilitar Google Sheets API.
- [ ] Criar Service Account.
- [ ] Compartilhar a planilha com o e-mail da Service Account.
- [ ] Criar `.env.local` a partir de `.env.example`.
- [ ] Validar `vercel dev`.
- [ ] Criar/importar projeto na Vercel.
- [ ] Configurar as variaveis de ambiente na Vercel como sensiveis.
- [ ] Validar leitura em `/api/materiais`.
- [ ] Validar escrita em uma copia da planilha ou janela controlada.
- [ ] Rotacionar/remover credenciais do proprietario anterior.

## Troubleshooting

| Sintoma | Causa provavel | Acao |
|---|---|---|
| `Configuracao de ambiente incompleta` | Variavel obrigatoria ausente. | Conferir `GSHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`. |
| `Falha ao autenticar no Google OAuth` | Chave privada invalida ou Service Account incorreta. | Recriar chave e conferir `\n` escapado. |
| `Falha Google Sheets (HTTP 403)` | Service Account sem permissao na planilha. | Compartilhar a planilha com o e-mail da Service Account como editor. |
| `Falha Google Sheets (HTTP 404)` | Sheet ID errado ou planilha inacessivel. | Conferir `GSHEETS_SPREADSHEET_ID`. |
| Material invalido | `material_id` nao existe na aba `materiais`. | Usar IDs canonicos da planilha. |
| Saldo insuficiente | Regras de estoque bloquearam a operacao. | Auditar `estoque`, `pedidos` e `pedido_itens` antes de alterar dados. |
| `vercel build` pede project settings | Settings locais ausentes. | Rodar `vercel pull` somente quando autorizado a atualizar `.vercel/`. |

## Prontidao de handoff

| Area | Status | Observacao |
|---|---|---|
| Codigo-fonte | OK | App e handlers estao versionados. |
| Git/GitHub | OK | Remote GitHub configurado. |
| `.gitignore` | OK | Bloqueia `.env*`, `.vercel`, chaves e artefatos locais relevantes. |
| Secrets | Atencao | Sem `.env.local` versionado agora, mas ha risco historico registrado e variaveis Vercel Production/Development aparecem como non-sensitive. |
| `.env.example` | OK | Criado com placeholders. |
| Documentacao | OK | Este README consolida handoff; docs tecnicos seguem em `materiais-evento-v1/docs/spec/`. |
| Execucao local | Atencao | Requer Vercel CLI e credenciais; nao foi validada ponta a ponta nesta auditoria. |
| Build | Atencao | `vercel build` requer settings locais via `vercel pull`; nao executado para evitar alterar config local. |
| Vercel | OK | Projeto e deployment production `READY` confirmados. |
| Google Sheets | OK | Abas e cabecalhos confirmados por leitura. |
| Google Cloud | Atencao | Novo responsavel precisa Service Account/projeto proprio ou transferencia controlada. |
| Credenciais | Bloqueador operacional | Sem credenciais proprias, novo responsavel nao consegue rodar/deployar com escrita na planilha. |
