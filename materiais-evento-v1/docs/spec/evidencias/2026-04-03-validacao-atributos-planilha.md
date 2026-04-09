# Evidencia - Validacao de atributos da planilha

Data: 2026-04-03
Fonte: imagem anexada na conversa (captura da planilha Google Sheets)

## Abas verificadas

- `materiais`
- `pedidos`
- `pedido_itens`
- `estoque`
- `companheiros` (ou `companheiro`, ver observacoes)
- `financeiro`

## Checklist de atributos por aba

### materiais

Esperado:
- `id`, `nome`, `emoji`, `preco`, `ativo`, `estoque_minimo`

Visto na imagem:
- `id`, `nome`, `emoji`, `preco`, `ativo`, `estoque_minimo`

Status: OK

### pedidos

Esperado:
- `id`, `nome`, `telefone`, `status_pagamento`, `created_at`

Visto na imagem:
- `id`, `nome`, `telefone`, `status_pagamento`, `created_at`

Status: OK

### pedido_itens

Esperado:
- `id`, `pedido_id`, `material_id`, `quantidade`, `preco`

Visto na imagem:
- `id`, `pedido_id`, `material_id`, `quantidade`, `preco`

Status: OK

### estoque

Esperado:
- `id`, `material_id`, `tipo`, `quantidade`, `origem`, `created_at`, `companheiro_id`, `destino_tipo`

Visto na imagem:
- `id`, `material_id`, `tipo`, `quantidade`, `origem`, `created_at`, `companheiro_id`, `destino_tipo`

Status: OK

### companheiros

Esperado:
- `id`, `nome`, `ativo`, `created_at`

Visto na imagem:
- `id`, `nome`, `ativo`, `created_at`

Status: OK (colunas)

### financeiro

Esperado:
- `id`, `tipo`, `origem_tipo`, `origem_id`, `companheiro_id`, `material_id`, `quantidade`, `valor_unitario`, `valor_total`, `status_repasse`, `created_at`

Visto na imagem:
- `id`, `tipo`, `origem_tipo`, `origem_id`, `companheiro_id`, `material_id`, `quantidade`, `valor_unitario`, `valor_total`, `status_repasse`, `created_at`

Status: OK

## Observacoes de consistencia

1. Em algumas janelas da captura, a aba aparece como `companheiro` (singular) e em outra como `companheiros` (plural).
- A API usa `companheiros!A2:D`.
- Se o nome real da aba estiver singular no arquivo ativo, os endpoints de escrita podem falhar.

2. O id do terceiro companheiro aparece truncado visualmente (`leandro-csa-gar...`).
- No contrato do spec: `leandro-csa-guarulhos`.
- No seed do codigo atual existe variacao tipografica/ortografica.

3. A imagem confirma esquema de colunas, mas nao confirma escrita ponta a ponta dos fluxos 2,3,4,5,7,8,9.

## Conclusao

- Estrutura de colunas das abas obrigatorias: conforme contrato.
- Pontos a confirmar no arquivo real da planilha:
  - nome exato da aba `companheiros`;
  - id exato do terceiro companheiro (`...guarulhos` vs variacao).
