# Plano Manual de Validacao - Modelo de Dados e Regras de Negocio

Data base: 2026-04-05
Ambiente alvo: `vercel dev` local (`http://localhost:3010`)

## Objetivo

Validar ponta a ponta os fluxos de `Resumo`, `Pedidos`, `Estoque`, `+ MATERIAL` e formularios com base nas 6 abas:

- `materiais`
- `pedidos`
- `pedido_itens`
- `estoque`
- `companheiros`
- `financeiro`

## Pre-condicoes

1. `vercel dev` ativo na raiz do projeto.
2. `.env.local` configurado com:
   - `GSHEETS_SPREADSHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
3. Backup da planilha feito antes de truncar dados.

## Truncamento transacional

Escopo do truncamento:
- Limpar apenas: `pedidos`, `pedido_itens`, `estoque`, `financeiro`
- Nao limpar: `materiais`, `companheiros`

Comando:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\truncate-transacional.ps1 -BaseUrl http://localhost:3010
```

Validacao pos-truncamento:
- `GET /api/pedidos` => `pedidos=[]`
- `GET /api/financeiro` => `financeiro=[]`
- `GET /api/estoque/resumo` => saldo global e por companheiro zerados
- `GET /api/companheiros` => companheiros ativos disponiveis

## Roteiro manual com gabarito

1. Sanidade inicial
- Passo: abrir app, navegar entre abas.
- Esperado: sem erro, materiais e companheiros carregados.

2. Entrada de estoque global
- Passo: `+ MATERIAL` tipo `entrada`:
  - `camiseta=20`
  - `caneca=10`
- Esperado: global `camiseta=20`, `caneca=10`.

3. Transferencia para companheiro
- Passo: `+ MATERIAL` tipo `transferencia_companheiro` para `hugo`:
  - `camiseta=5`
  - `caneca=3`
- Esperado:
  - global `camiseta=15`, `caneca=7`
  - `hugo`: `camiseta=5`, `caneca=3`

4. Criar pedido
- Passo: pedido novo com `2 camiseta + 1 caneca`, companheiro `hugo`, `pago=Não`.
- Esperado:
  - persistido com sucesso em `PUT /api/pedidos`
  - total do pedido `R$ 135`
  - global cai para `camiseta=13`, `caneca=6`

5. Editar pedido
- Passo: alterar para `3 camiseta + 1 caneca` (mesmo companheiro).
- Esperado:
  - total do pedido `R$ 185`
  - global `camiseta=12`, `caneca=6`

6. Marcar pago
- Passo: marcar pedido como pago.
- Esperado:
  - pedido com status `Sim`
  - resumo: `recebido=185`, `pendente=0`

7. Excluir pedido
- Passo: excluir pedido.
- Esperado:
  - `pedidos=[]`
  - global volta para `camiseta=15`, `caneca=7`

8. Venda do companheiro
- Passo: `+ MATERIAL` tipo `venda_companheiro`, `hugo`, `camiseta=2`.
- Esperado:
  - movimento em `estoque` registrado
  - `financeiro` criado com:
    - `status_repasse=pendente`
    - `valor_unitario=50`
    - `valor_total=100`
  - saldo global `camiseta=13`
  - saldo de `hugo` em `camiseta=3`

9. Repasse financeiro
- Passo: `PATCH /api/financeiro/{id}/repasse`.
- Esperado: `status_repasse=repassado`.

10. Casos negativos obrigatorios
- Pedido sem companheiro por item => erro `companheiro_id obrigatorio`.
- Transferencia acima do global => erro `Estoque global insuficiente`.
- Venda acima do saldo do companheiro => erro `Saldo do companheiro insuficiente`.
- Quantidade 0 => erro `quantidade invalida`.

## Execucao automatizada de apoio (gabarito)

Comando:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validar-plano-manual.ps1 -BaseUrl http://localhost:3010
```

O script executa os 10 cenarios via API e valida os resultados esperados do gabarito.

## Evidencias minimas por cenario manual

1. Print da tela relevante (UI).
2. Payload e resposta da API usada no passo.
3. Snapshot da aba afetada na planilha.
