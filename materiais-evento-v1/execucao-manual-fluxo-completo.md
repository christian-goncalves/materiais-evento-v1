# Execução Manual - Fluxo Completo (Estoque, Pedidos, Pagamentos, Resumo)

Data: 2026-04-06
Projeto: `c:\laragon\www\encompasso\materiais-evento-v1`
Base inicial: `pedidos`, `pedido_itens`, `estoque`, `financeiro` zerados; `materiais` e `companheiros` mantidos.

## Status consolidado

- Total de tarefas: 12
- OK: 12
- FALHOU: 1
- PENDENTE: 0

## Registro de tarefas

| ID | Tarefa | Critério de aceite | Resultado (`OK/FALHOU/PENDENTE`) | Evidência / anotação |
|---|---|---|---|---|
| T01 | Sanidade inicial da UI e abas | App abre sem erro, abas `Resumo`, `Pedidos`, `Estoque`, `Novo` navegáveis | OK | Confirmado pelo usuário: navegação e carga inicial sem falha |
| T02 | `+ MATERIAL` valida campos obrigatórios | Sem `entrada/saida` ou sem `companheiro` não salva e mostra erro | OK | Confirmado pelo usuário: bloqueios de obrigatoriedade funcionando |
| T03 | `+ MATERIAL` valida quantidade inválida | Quantidade `0` ou vazia bloqueia salvamento com erro | OK | Confirmado pelo usuário: bloqueou em vazio e em 0 |
| T04 | Carga inicial por companheiro (entrada) | Movimentos de entrada gravam e saldos global/companheiros sobem conforme esperado | OK | Confirmado. Observacao: para cenarios com todos os itens, incluir carga de chaveiro na precondicao |
| T05 | Saída com bloqueio de saldo global | Saída acima do saldo global retorna erro de estoque insuficiente | OK | Confirmado pelo usuário: bloqueio aplicado |
| T06 | Saída com bloqueio de saldo do companheiro | Saída acima do saldo do companheiro retorna erro de saldo insuficiente | OK | Confirmado pelo usuário: bloqueio aplicado |
| T07 | Criar pedido com todos os itens e companheiro por item | Pedido salva, itens e companheiros persistem, estoque reflete `saida_pedido` | OK | Confirmado com evidencia: pedido criado com 4 itens (incluindo chaveiro), pedido_itens e estoque com saida_pedido coerentes |
| T08 | Editar pedido (quantidade + companheiro) | Edição salva e recalcula estoque/totais sem inconsistência | OK | Reteste aprovado: total R$165 (camiseta=2, caneca=1, garrafa=0, chaveiro=2), com validacao de saldo aplicada no primeiro intento |
| T09 | Fluxo de pagamento (`Pendente -> Pago`) | Botão/edição mudam status, resumo e cards atualizam corretamente | OK | Confirmado pelo usuário: transicao concluida e totais atualizados |
| T10 | Excluir pedido | Pedido removido, totais e estoque voltam ao estado esperado | OK | Confirmado pelo usuário: pedido removido e totais zerados |
| T11 | Persistência após refresh | Recarregar página preserva estado de pedidos, saldos e status | OK | Confirmado pelo usuário: estado consistente apos refresh |
| T12 | Consistência de PDF vs tela | PDF exportado mantém totais e status coerentes com a UI | PENDENTE | |

## Como registrar a execução

Após cada bloco executado, registrar no item correspondente:

- `Resultado`: `OK`, `FALHOU` ou `PENDENTE`
- `Evidência / anotação`: mensagem curta com resultado observado (e erro, se houver)

Exemplo de anotação:

`OK - bloqueou sem companheiro com toast "Selecione o companheiro"`

## Ordem oficial de execução em blocos

1. T01
2. T02 + T03
3. T04
4. T05 + T06
5. T07
6. T08
7. T09
8. T10
9. T11
10. T12












## Observacoes finais

- Correcao aplicada: saldo por companheiro agora abate saida_pedido em pi/_inventory.js (companionDelta).
- Reteste validado pelo usuário.

