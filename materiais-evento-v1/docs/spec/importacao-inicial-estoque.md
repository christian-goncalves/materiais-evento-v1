# Importacao Inicial + Aba Estoque (Plano Minimo)

## Objetivo

- Importar os dados ja existentes do app em producao para a base atual via seed local.
- Adicionar uma aba `Estoque` com leitura de saldo e acao minima de movimentacao via botao `+ material`.

## Fonte de verdade da importacao

- Capturas e PDF em `docs/materiais.factoria.dev/images`.
- Seed consolidado em `docs/materiais.factoria.dev/producao-seed.json`.

## Execucao da importacao

Comando:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import-producao.ps1 -BaseUrl http://localhost:3010
```

Modo sem escrita (validacao do seed):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import-producao.ps1 -BaseUrl http://localhost:3010 -SkipWrite
```

## Escopo da aba Estoque

- Leitura de saldos com `GET /api/estoque/resumo`.
- Acao operacional minima via botao `+ material` (frontend):
  - grava movimentos por `POST /api/estoque/entrada`;
  - suporta `entrada`, `ajuste`, `transferencia_companheiro`, `venda_companheiro`.
- Conteudo minimo:
  - saldo global por material;
  - saldo por companheiro por material.

## Checklist pos-importacao

- [ ] `GET /api/pedidos` com quantidade esperada do seed.
- [ ] Total calculado dos pedidos batendo com o seed.
- [ ] `GET /api/estoque/resumo` retornando saldos globais e por companheiro.
- [ ] Aba `Estoque` carregando sem quebrar `Resumo`, `Pedidos` e `Novo`.

