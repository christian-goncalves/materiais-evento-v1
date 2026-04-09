# Contratos de Dados

## Endpoints oficiais

- `GET /api/materiais`
- `GET /api/pedidos`
- `PUT /api/pedidos`
- `GET /api/companheiros`
- `POST /api/estoque/transferencia`
- `POST /api/estoque/venda-companheiro`
- `POST /api/estoque/entrada`
- `GET /api/estoque/resumo`
- `GET /api/financeiro`
- `PATCH /api/financeiro/:id/repasse`

## Pre-requisitos de execucao dos contratos

Variaveis obrigatorias:
- `GSHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

Regras:
- Contratos de API dependem dessas variaveis estarem definidas no `.env.local` (local) ou na Vercel (deploy).
- Quando variavel obrigatoria faltar, API deve retornar erro sanitizado (sem expor segredo).

Abas obrigatorias na planilha:
- `materiais`
- `pedidos`
- `pedido_itens`
- `estoque`
- `companheiros`
- `financeiro`

## Contrato - GET /api/materiais

Resposta:

```json
[
  {
    "id": "camiseta",
    "nome": "Camiseta",
    "emoji": "👕",
    "preco": 50,
    "ativo": true,
    "estoque_minimo": 10
  }
]
```

Mapeamento planilha:
- Aba `materiais`: `id`, `nome`, `emoji`, `preco`, `ativo`, `estoque_minimo`.

## Contrato - GET /api/pedidos

Resposta (mantida compativel com o frontend atual):

```json
{
  "pedidos": [
    {
      "id": 1,
      "nome": "Cliente",
      "data": "03/04/2026",
      "tel": "",
      "itens": {
        "camiseta": 2
      },
      "companheiro_por_item": {
        "camiseta": "hugo"
      },
      "pago": "Nao",
      "pagData": ""
    }
  ]
}
```

Mapeamento planilha:
- Aba `pedidos`: `id`, `nome`, `telefone`, `status_pagamento`, `created_at`.
- Aba `pedido_itens`: `id`, `pedido_id`, `material_id`, `quantidade`, `preco`.

Regra de projecao:
- `itens` no frontend e reconstruido de `pedido_itens` por `pedido_id`.

## Contrato - PUT /api/pedidos

Entrada:

```json
{
  "pedidos": []
}
```

Saida:

```json
{
  "ok": true,
  "updated_at": "2026-04-03T00:00:00.000Z"
}
```

Validacao minima:
- `pedidos` deve ser array.
- `id` numerico.
- `nome` obrigatorio.
- `itens` objeto com ids validos de material.
- `quantidade` inteira > 0.
- `pago` com valores aceitos (`Sim`/`Nao`).
- `companheiro_por_item[material_id]` obrigatorio para novos pedidos.
- `companheiro_por_item[material_id]` deve existir e estar ativo.
- Bloqueia salvamento quando saldo do companheiro for insuficiente para os itens do pedido.

## Estoque e baixo estoque

Mapeamento planilha:
- Aba `estoque`: `id`, `material_id`, `tipo`, `quantidade`, `origem`, `created_at`, `companheiro_id`, `destino_tipo`.

Regras:
- Entrada de reposicao grava `tipo=entrada`.
- Salvamento de pedidos grava `tipo=saida_pedido` por item.
- Transferencia para companheiro grava `tipo=transferencia_companheiro`.
- Venda por companheiro grava `tipo=venda_companheiro`.
- Saldo por material = soma(entrada) - soma(saida).
- Estoque baixo quando saldo < `estoque_minimo`.

## Fluxo companheiros e financeiro (v1 essencial)

- `GET /api/companheiros`:
  - Garante seed inicial com:
    - `hugo` | Hugo
    - `turco` | Turco
    - `leandro-csa-guarulhos` | Leandro CSA Garulho

- `POST /api/estoque/transferencia`:
  - Entrada: `companheiro_id`, `material_id`, `quantidade`, `origem?`
  - Efeito: cria movimento de estoque sem lancamento financeiro.

- `POST /api/estoque/venda-companheiro`:
  - Entrada: `companheiro_id`, `material_id`, `quantidade`, `valor_unitario?`, `origem?`
  - Efeito: cria movimento de estoque + lancamento em `financeiro` com `status_repasse=pendente`.

- `POST /api/estoque/entrada`:
  - Entrada simplificada (frontend): `material_id`, `quantidade`, `companheiro_id?`
  - Entrada legada (compatibilidade): `tipo`, `origem?`, `destino_tipo?`, `valor_unitario?`
  - Deducao automatica (quando `tipo` nao e informado):
    - sem `companheiro_id`: `tipo=entrada`, `origem=reposicao`, `destino_tipo=''`
    - com `companheiro_id`: `tipo=transferencia_companheiro`, `origem=transferencia_manual`, `destino_tipo=companheiro`
  - `tipo` permitido (compatibilidade): `entrada`, `ajuste`, `transferencia_companheiro`, `venda_companheiro`
  - Efeito:
    - `entrada`/`ajuste`: cria movimento em `estoque`.
    - `transferencia_companheiro`: exige `companheiro_id` e saldo global suficiente.
    - `venda_companheiro`: exige `companheiro_id`, saldo do companheiro e global; cria movimento em `estoque` + lancamento em `financeiro` pendente.

- `PATCH /api/financeiro/:id/repasse`:
  - Efeito: atualiza apenas `status_repasse` para `repassado` sem alterar estoque.

Validacoes minimas adicionais:
- `companheiro_id` existente e ativo.
- Bloqueio de venda se saldo do companheiro insuficiente.
- Bloqueio de transferencia/venda se estoque global insuficiente.



## Atualizacao de IDs de companheiros (2026-04-05)

- IDs canonicos para contrato: `hugo`, `turco`, `leandro-csa-guarulhos`.
- Compatibilidade: aliases legados de planilha (`hu`, `tu`, `le`) sao aceitos e normalizados para os IDs canonicos em runtime.

