# Plano de Etapas e Subetapas

## Status geral

- [x] Fase 0 - Preparacao de ambiente local
- [x] Fase 1 - Base do spec
- [x] Fase 2 - API de leitura
- [x] Fase 3 - API de gravacao
- [x] Fase 4 - Adaptacao do frontend
- [ ] Fase 5 - Validacao final e PR

## Registro de execucao local

- Ambiente local validado com `vercel dev`.
- API Google Sheets validada com Service Account.
- Smoke de leitura concluido.
- Smoke com escrita concluido apos correcao do endpoint `values:batchClear`.`n- Cenarios obrigatorios 1 a 9 validados com evidencias.
- Porta efetiva de execucao local validada: `http://localhost:3010`.

## Fase 0 - Preparacao de ambiente local

Subetapas:
1. Instalar stack local (Node LTS + npm + Vercel CLI).
2. Configurar `.env.local` com variaveis obrigatorias.
3. Validar servidor local com `vercel dev`.

DoD:
- `node -v` e `vercel --version` funcionando.
- `.env.local` presente com 3 variaveis obrigatorias.
- `vercel dev` iniciando sem falha de boot.

Dependencias:
- Nenhuma.

## Fase 1 - Base do spec

Subetapas:
1. Consolidar este framework em `docs/spec/`.
2. Alinhar contratos e criterios de aceite.

DoD:
- 5 documentos do spec criados e coerentes entre si.
- Regras de execucao sem decisoes criticas em aberto.

Dependencias:
- Fase 0 concluida.

## Fase 2 - API de leitura

Subetapas:
1. Criar cliente Google Sheets no `api/`.
2. Implementar `GET /api/materiais`.
3. Implementar `GET /api/pedidos`.

DoD:
- Endpoints retornam contrato esperado.
- Erros retornam mensagem sanitizada.

Dependencias:
- Fase 1 concluida.
- Variaveis de ambiente configuradas.

## Fase 3 - API de gravacao

Subetapas:
1. Implementar `PUT /api/pedidos` com validacao minima.
2. Persistir `pedidos` e projetar `pedido_itens`.
3. Gerar movimentacao `saida_pedido` em `estoque` por pedido salvo.

DoD:
- Gravacao funcional com validacao de payload.
- Planilhas atualizadas com consistencia minima.

Dependencias:
- Fase 2 concluida.

## Fase 4 - Adaptacao do frontend

Subetapas:
1. Trocar funcoes de leitura/escrita no `index.html`.
2. Remover dependencia do token GitHub no fluxo de dados.
3. Preservar UI e fluxo atuais.

DoD:
- Fluxo de pedidos funcional sem GitHub API.
- Sem alteracao visual fora de escopo.

Dependencias:
- Fase 2 e Fase 3 concluidas.

## Fase 5 - Validacao final e PR

Subetapas:
1. Executar smoke local de leitura (`-SkipWrite`).
2. Executar smoke local com escrita (`-SkipWrite:$false`).
3. Atualizar README com nova configuracao minima.
4. Preparar PR com diff pequeno e explicavel.

DoD:
- Smoke HTTP completo executado com servidor local ativo.
- Endpoints essenciais retornando 200.
- Checklist de aceite completo.
- Seguranca minima aplicada.
- PR pronto para revisao.

Dependencias:
- Fase 4 concluida.


