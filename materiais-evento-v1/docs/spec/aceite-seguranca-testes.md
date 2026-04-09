# Aceite, Seguranca e Testes

## Checklist de ambiente local (antes do smoke)

- [x] `node -v` funcionando.
- [x] `vercel --version` funcionando.
- [x] Arquivo `.env.local` presente na raiz.
- [x] Variaveis obrigatorias definidas:
  - `GSHEETS_SPREADSHEET_ID`
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_PRIVATE_KEY`
- [x] `vercel dev` ativo (porta efetiva validada localmente em `http://localhost:3010`).

## Smoke tests obrigatorios

### Smoke leitura (sem escrita) - concluido

Comando:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-api.ps1 -BaseUrl http://localhost:3010 -SkipWrite
```

### Smoke com escrita - concluido

Comando:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-api.ps1 -BaseUrl http://localhost:3010 -SkipWrite:$false
```

Status real em 2026-04-03:
- Aprovado apos correcao de `clearRanges` para `/values:batchClear`.

## Cenarios funcionais obrigatorios

1. Carregar materiais na interface.
2. Criar pedido com dois itens.
3. Editar pedido criado.
4. Marcar pedido como pago.
5. Excluir pedido.
6. Ler companheiros por `GET /api/companheiros`.
7. Transferir material para companheiro (`POST /api/estoque/transferencia`).
8. Registrar venda do companheiro (`POST /api/estoque/venda-companheiro`).
9. Marcar repasse (`PATCH /api/financeiro/:id/repasse`).

Criterio:
- Fluxo completo sem quebrar UI nem navegacao.
- Fluxos de companheiro e financeiro com consistencia de saldo.
- Endpoints essenciais retornando 200 ponta a ponta.

## Status real de validacao manual (2026-04-03)

- [x] 1. Carregar materiais na interface.
  - Evidencia: UI abriu com status `Sincronizado` e material carregado.
- [x] 2. Criar pedido com dois itens.
  - Evidencia: `PUT /api/pedidos` 200 com itens `{camiseta:1, caneca:1}` e `GET /api/pedidos` refletindo ambos materiais.
- [x] 3. Editar pedido criado.
  - Evidencia: `PUT /api/pedidos` 200 com alteracao de nome/telefone/quantidades e `GET /api/pedidos` coerente.
- [x] 4. Marcar pedido como pago.
  - Evidencia: `PUT /api/pedidos` 200 com `pago=Sim` e retorno em `GET /api/pedidos` com status pago.
- [x] 5. Excluir pedido.
  - Evidencia: `PUT /api/pedidos` 200 com `pedidos=[]` e `GET /api/pedidos` retornando lista vazia.
- [x] 6. Ler companheiros por `GET /api/companheiros`.
  - Evidencia: retorno 200 com array de companheiros.
- [x] 7. Transferir material para companheiro (`POST /api/estoque/transferencia`).
  - Evidencia: retorno 200 com `movimento.id=2`; aba `estoque` com `tipo=transferencia_companheiro`.
- [x] 8. Registrar venda do companheiro (`POST /api/estoque/venda-companheiro`).
  - Evidencia: retorno 200 com `movimento_id=3` e `financeiro_id=1`; abas `estoque` e `financeiro` atualizadas.
- [x] 9. Marcar repasse (`PATCH /api/financeiro/:id/repasse`).
  - Evidencia: retorno 200 com `status_repasse=repassado`; aba `financeiro` atualizada.

## Verificacoes de dados

- `pedidos` com linhas consistentes.
- `pedido_itens` refletindo itens de cada pedido.
- `estoque` registrando `saida_pedido` no salvamento de pedidos.
- `estoque` registrando `transferencia_companheiro` e `venda_companheiro` corretamente.
- `financeiro` com `status_repasse=pendente` na venda e `repassado` apos patch.
- Saldo de estoque global e por companheiro calculavel por agregacao.

## Criterios minimos de seguranca

- Credenciais apenas em variaveis de ambiente.
- Nenhuma credencial no frontend.
- Comunicacao com Google Sheets apenas no servidor (`api/`).
- Validacao minima de entrada antes de gravar.
- Bloqueio de venda acima do saldo do companheiro.
- Erros de API sem exposicao de detalhes sensiveis.

## Checklist objetivo para PR

- [ ] Escopo respeitado (sem overengineering).
- [ ] Mudancas concentradas em pontos de acesso a dados.
- [ ] Contratos de API atendidos.
- [x] Smoke de leitura executado e registrado.
- [x] Smoke com escrita executado e registrado.
- [ ] README atualizado no minimo necessario.
- [ ] Sem segredos versionados no repositorio.

Evidencia estrutural de atributos da planilha: `docs/spec/evidencias/2026-04-03-validacao-atributos-planilha.md`

Evidencia tecnica de diagnostico/correcao: `docs/spec/evidencias/2026-04-03-diagnostico-500.md`

Evidencia de execucao dos cenarios 7, 8 e 9: `docs/spec/evidencias/2026-04-03-cenarios-7-8-9.md`

## Atualizacao de contrato (2026-04-03)

- A partir desta versao, novos pedidos exigem companheiro_por_item por material.
- O cenario funcional de pedidos (2,3,4,5) deve ser revalidado com selecao explicita de companheiro por item.
- A aba Estoque passou a incluir acao + material com persistencia via POST /api/estoque/entrada.

