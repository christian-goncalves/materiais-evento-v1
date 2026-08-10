# Diagnostico de estabilizacao - materiais-evento

Data: 2026-04-28
Planilha: `materiais-evento`
Backup criado: `materiais-evento-backup-2026-04-28`

## Estado validado

- A aba `materiais` usa os IDs canonicos `camiseta-p`, `camiseta-g`, `caneca`, `garrafa`, `chaveiro` e `copo-termico`.
- A aba `pedido_itens` nao possui mais registros com `material_id=camiseta`; os pedidos historicos de camiseta foram normalizados para `camiseta-p`.
- A aba `estoque` possui IDs numericos de `1` a `27`.
- Na aba `estoque`, `tipo=ajuste` representa entrada manual correta por companheiro.
- Na aba `estoque`, `tipo=saida_pedido` representa baixa vinculada a `pedidos` e `pedido_itens`.
- A aba `estoque_manual` e referencia visual/de conferencia e nao e consumida pela API.
- A aba `financeiro` esta vazia, somente com cabecalho; esse e o estado esperado nesta etapa.

## Mapeamento visual x ID tecnico

- `camiseta P` -> `camiseta-p`
- `camiseta G` -> `camiseta-g`
- `copo termico` -> `copo-termico`

## Regras de manutencao

- Nao inserir `material_id=camiseta` em abas transacionais.
- Novos pedidos devem usar `camiseta-p` ou `camiseta-g`.
- `estoque_manual` pode usar nomes amigaveis, desde que a migracao para `estoque` aplique o mapeamento tecnico.
- Como nao ha Git disponivel no ambiente atual, o rollback de dados deve usar a planilha backup.
