# Diagnostico das regras de venda e estoque

Data da analise: 2026-07-31  
Status: diagnostico concluido; nenhuma escrita na planilha e nenhum deploy realizados

## Contexto e fontes verificadas

- Aplicacao de producao: `https://encompasso.vercel.app`
- Projeto Vercel: `encompasso` (`prj_HjYxZAVwcZ3CBPU0aBC3D1DCdEFN`)
- Deployment de producao observado: `dpl_AurCBPm7xKNfm4ps9LSCXADaAdBM`
- Repositorio conectado: `christian-goncalves/materiais-evento-v1`
- Commit publicado: `2f91a1d268bdfadaca4b525ccd6876db312b0867`
- Planilha informada: `1n6-06J5G1E80b0i8F6sfcikhNxXIPZ8rrDQf7jOdzxs`
- Dados lidos de forma nao destrutiva pelos endpoints de producao: `/api/materiais`, `/api/companheiros`, `/api/estoque/resumo` e `/api/pedidos`.
- Codigo analisado: `api/_inventory.js`, `api/pedidos.js`, `api/estoque/entrada.js`, `api/estoque/venda-companheiro.js`, `api/estoque/transferencia.js` e o fluxo do formulario em `index.html`.

O acesso interativo direto ao Google Sheets nao foi necessario para fechar a causa. A API de producao le a planilha configurada na Vercel e devolveu os saldos e pedidos usados neste diagnostico. Antes de qualquer correcao de dados, a aba `estoque` deve ser conferida diretamente e deve ser criado um backup da planilha.

## Resposta curta

A mensagem de estoque insuficiente nao significa necessariamente que o novo pedido, isoladamente, seja inviavel. O endpoint `PUT /api/pedidos` recebe e regrava a colecao completa de pedidos. Antes de salvar, ele remove logicamente todas as baixas `saida_pedido`, recalcula a base e revalida novamente todos os pedidos historicos.

Existe hoje uma inconsistencia historica em `leandro-csa-guarulhos + caneca`:

- pedidos atribuidos ao companheiro: 7 + 4 + 4 = **15 canecas**;
- saldo atual apresentado pela API: **-9 canecas**;
- saldo-base reconstruido antes das baixas dos pedidos: `-9 + 15 = 6 canecas`;
- deficit historico: `15 - 6 = 9 canecas`.

Portanto, qualquer operacao que chame `salvarPedidos()` pode ser bloqueada por essa divergencia antiga, mesmo que a nova venda use outro material ou outro companheiro. Isso inclui registrar pedido, editar, excluir e marcar como pago.

## Regra implementada atualmente

### Registro de pedido pela interface

1. Para cada material selecionado, a interface exige um `companheiro_id`.
2. A interface adiciona o novo pedido ao array local com todos os pedidos existentes.
3. Envia o array completo por `PUT /api/pedidos`.
4. O backend carrega todos os movimentos da aba `estoque`.
5. Desconsidera temporariamente todos os movimentos `saida_pedido` para reconstruir o saldo-base por companheiro.
6. Soma o consumo de todos os pedidos, agrupado por `companheiro_id + material_id`.
7. Rejeita toda a gravacao se qualquer grupo consumir mais que o saldo-base.
8. Se tudo for valido, limpa e reescreve `pedidos`, `pedido_itens` e `estoque`, preservando movimentos que nao sejam `saida_pedido` e reconstruindo todas essas baixas.

Condicao aplicada:

```text
saldo_base_do_companheiro(material) >= soma_de_todos_os_pedidos_atribuidos
```

O erro correspondente e:

```text
Saldo insuficiente para <companheiro_id> em <material_id>
```

### Movimentos de estoque

O codigo possui tres conceitos que precisam ser distinguidos:

- `transferencia_companheiro`: retira do saldo chamado `global` e acrescenta ao saldo do companheiro;
- `saida_pedido`: retira do saldo chamado `global` e tambem do saldo do companheiro;
- `venda_companheiro`: retira do saldo chamado `global` e tambem do saldo do companheiro, alem de criar lancamento financeiro.

O formulario principal de novo pedido usa `saida_pedido`; ele nao usa o endpoint dedicado `venda-companheiro`. Assim, existem dois caminhos tecnicos capazes de representar uma venda, com risco de sobreposicao conceitual.

## Estado de producao observado

### Saldo chamado global

| Material | Saldo |
|---|---:|
| Camiseta P | 103 |
| Camiseta G | 111 |
| Caneca | 0 |
| Garrafa | 6 |
| Chaveiro | 0 |
| Copo termico | 0 |

### Saldos por companheiro

| Companheiro | Camiseta P | Camiseta G | Caneca | Garrafa |
|---|---:|---:|---:|---:|
| Hugo | 15 | 19 | 3 | 0 |
| Turco | 8 | 16 | 2 | 0 |
| Leandro CSA Guarulhos | 20 | 0 | **-9** | 0 |
| Rodrigo CSA Costa Verde | 11 | 20 | 0 | 0 |
| Hercules | 49 | 56 | 4 | 6 |

Os saldos zero de chaveiro e copo termico foram omitidos da segunda tabela porque sao zero para todos.

## Causa raiz

Ha duas causas relacionadas, mas a primeira explica o bloqueio atual.

### 1. Inconsistencia de dados historicos bloqueia toda nova gravacao

Os pedidos 20, 23 e 24 atribuem respectivamente 7, 4 e 4 canecas a Leandro. A soma e 15, contra uma base reconstruida de 6. O validador nao tolera o deficit de 9 e, por trabalhar sobre a colecao inteira, impede a gravacao de qualquer alteracao.

Essa protecao evita aprofundar estoque negativo, mas o escopo da validacao e amplo demais: um problema historico nao relacionado bloqueia uma venda nova valida.

### 2. O significado de `global` esta ambiguo

Se `global` significa **estoque no deposito central**, uma transferencia para companheiro deve reduzi-lo, mas uma venda posterior feita pelo companheiro nao deve reduzi-lo novamente.

Se `global` significa **estoque total da rede**, uma transferencia entre deposito e companheiro nao deve altera-lo; apenas uma venda ao cliente deve reduzi-lo.

Hoje transferencia e venda/saida reduzem `global`. Isso mistura as duas interpretacoes e pode produzir dupla baixa: uma unidade sai do global ao ser transferida e volta a sair do global ao ser vendida. A tela chama esse numero de “Saldo Global”, o que reforca a ambiguidade.

## Intervencao recomendada

### Etapa 1 - reconciliar os dados antes de liberar gravacoes

Nao se recomenda simplesmente remover a validacao nem inserir `+9` sem conferencia. Deve-se confrontar os movimentos reais de caneca de Leandro na aba `estoque` com comprovantes/registros operacionais e escolher uma destas correcoes:

1. registrar a transferencia ou entrada faltante, caso Leandro realmente tenha recebido as 9 unidades;
2. reatribuir pedidos ao companheiro que efetivamente possuia/vendeu as unidades;
3. corrigir quantidade ou remover duplicidade, caso algum pedido historico esteja errado.

Invariante para encerrar a reconciliacao:

```text
saldo de todo companheiro por material >= 0
```

Depois da correcao, validar por leitura que `GET /api/estoque/resumo` nao apresenta saldos negativos e testar uma venda controlada com backup/rollback definido.

### Etapa 2 - refatorar o contrato de pedidos

Recomendacao minima e segura:

- criar `POST /api/pedidos` para inserir apenas um novo pedido;
- criar `PATCH /api/pedidos/:id` para alterar apenas o pedido escolhido;
- manter exclusao explicita por `DELETE /api/pedidos/:id`;
- validar apenas o delta causado pela operacao corrente;
- fazer append/alteracao transacional em vez de limpar e reescrever tres abas inteiras;
- manter uma auditoria separada que liste inconsistencias historicas sem impedir operacoes nao relacionadas;
- usar controle de concorrencia/idempotencia para evitar duas vendas simultaneas consumirem o mesmo saldo.

A regra de uma nova venda deve ser:

```text
saldo_atual_do_companheiro(material) >= quantidade_da_nova_venda
```

Uma inconsistencia historica ainda deve aparecer como alerta critico, mas nao deve bloquear outro `companheiro_id + material_id` que esteja consistente.

### Etapa 3 - definir o modelo contabil de estoque

Adotar nomes e invariantes explicitos:

- `saldo_central`: unidades fisicamente no deposito;
- `saldo_companheiro`: unidades sob posse de cada companheiro;
- `saldo_total_rede = saldo_central + soma(saldos_companheiros)`;
- transferencia: `central -q`, `companheiro +q`, total da rede inalterado;
- venda: `companheiro -q`, total da rede `-q`, central inalterado;
- devolucao: `companheiro -q`, `central +q`, total da rede inalterado;
- ajuste: exige local, motivo e responsavel.

Tambem deve existir apenas um evento canonico para venda. `saida_pedido` pode referenciar o pedido e gerar o financeiro na mesma operacao, tornando desnecessario um segundo caminho concorrente chamado `venda_companheiro` para a mesma acao de negocio.

## Plano de validacao da correcao

1. Criar backup integral da planilha.
2. Exportar e auditar os movimentos de `caneca + leandro-csa-guarulhos`.
3. Aplicar a correcao de dados aprovada e ler novamente os saldos.
4. Confirmar que nenhum saldo por companheiro ficou negativo.
5. Em ambiente de preview ligado a uma planilha de teste, executar:
   - venda dentro do saldo;
   - venda exatamente no limite;
   - venda uma unidade acima do limite;
   - venda valida enquanto existe inconsistencia historica em outro par;
   - duas tentativas concorrentes sobre a ultima unidade;
   - edicao, exclusao e alteracao de pagamento sem reescrita indevida do estoque.
6. Conferir apos cada teste as abas `pedidos`, `pedido_itens`, `estoque` e `financeiro`.
7. Somente depois publicar em producao e repetir um teste controlado.

## Registro desta intervencao

- Foi feita apenas analise de codigo, metadados da Vercel e leituras GET da aplicacao publicada.
- Nenhum POST, PUT, PATCH ou DELETE foi enviado.
- Nenhuma celula da planilha foi alterada.
- Nenhum arquivo de regra de negocio foi modificado.
- Nenhum deploy foi criado.
- Este documento e o unico artefato novo da intervencao.

## Decisoes pendentes com o responsavel do negocio

1. As 9 canecas faltantes de Leandro foram entrega nao registrada, atribuicao errada de vendas ou duplicidade?
2. “Saldo Global” deve significar deposito central ou total fisico da rede?
3. Um pedido representa imediatamente uma baixa fisica ou apenas uma reserva ate entrega/pagamento?
4. Quem pode aplicar ajuste manual e qual evidencia/motivo deve ser obrigatorio?
5. O financeiro nasce ao registrar o pedido, ao entregar o material ou ao confirmar o pagamento?

Essas respostas determinam a correcao dos dados e a refatoracao correta. Sem elas, alterar a formula pode esconder a divergencia em vez de resolver a regra de negocio.
