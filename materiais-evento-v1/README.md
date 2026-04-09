# Encompasso · Controle de Materiais - NA

App web para controle de materiais, pedidos e posse de companheiros.

## Estrutura do projeto

```text
materiais-evento/
|-- index.html
|-- vercel.json
|-- api/
|   |-- _sheets.js
|   |-- _inventory.js
|   |-- materiais.js
|   |-- pedidos.js
|   |-- companheiros.js
|   |-- estoque/
|   |   |-- transferencia.js
|   |   |-- venda-companheiro.js
|   |   |-- resumo.js
|   |-- financeiro.js
|   |-- financeiro/
|       |-- [id]/repasse.js
|-- docs/spec/
|-- scripts/
```

## Persistencia atual

- Materiais, pedidos, estoque, companheiros e financeiro sao lidos/escritos via Google Sheets pela camada `api/`.
- Credenciais ficam apenas em variaveis de ambiente (server-side).
- O frontend nao recebe nem armazena credenciais.

## Variaveis de ambiente (Vercel)

- `GSHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

`GOOGLE_PRIVATE_KEY` deve ser salvo com `\n` (quebra de linha escapada).

## Abas esperadas na planilha

### materiais
- `id`
- `nome`
- `emoji`
- `preco`
- `ativo`
- `estoque_minimo`

### pedidos
- `id`
- `nome`
- `telefone`
- `status_pagamento`
- `created_at`

### pedido_itens
- `id`
- `pedido_id`
- `material_id`
- `quantidade`
- `preco`

### estoque
- `id`
- `material_id`
- `tipo`
- `quantidade`
- `origem`
- `created_at`
- `companheiro_id`
- `destino_tipo`

### companheiros
- `id`
- `nome`
- `ativo`
- `created_at`

### financeiro
- `id`
- `tipo`
- `origem_tipo`
- `origem_id`
- `companheiro_id`
- `material_id`
- `quantidade`
- `valor_unitario`
- `valor_total`
- `status_repasse`
- `created_at`

## Endpoints

- `GET /api/materiais`
- `GET /api/pedidos`
- `PUT /api/pedidos`
- `GET /api/companheiros`
- `POST /api/estoque/transferencia`
- `POST /api/estoque/venda-companheiro`
- `GET /api/estoque/resumo`
- `GET /api/financeiro`
- `PATCH /api/financeiro/:id/repasse`

## Fluxo de contribuicao

1. Criar branch de feature.
2. Fazer commits pequenos e descritivos.
3. Validar smoke test.
4. Abrir PR para o repositorio oficial.

## Fonte de verdade do projeto

Use `docs/spec/README.md` e documentos relacionados em `docs/spec/` como referencia operacional da refatoracao.
