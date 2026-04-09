# Escopo e Decisoes

## O que manter

- Estrutura atual do frontend estatico.
- Layout e comportamento visual existentes.
- Fluxo principal da aplicacao.
- Stack atual e modelo de deploy atual.
- Convencoes e organizacao existente, salvo necessidade estrita.

## O que alterar

- Leitura de materiais: JSON/GitHub -> API com Google Sheets.
- Leitura e gravacao de pedidos: JSON/GitHub -> API com Google Sheets.
- Adaptar apenas os pontos de acesso a dados no frontend.
- Adicionar aba `Estoque` somente leitura no frontend para consumo de `GET /api/estoque/resumo`.

## O que acrescentar

- Integracao com Google Sheets via API serverless em `api/`.
- Persistencia para abas: `materiais`, `pedidos`, `pedido_itens`, `estoque`, `companheiros`, `financeiro`.
- Controle de estoque por movimentacao e saldo derivado.
- Variaveis de ambiente para credenciais e identificadores.
- Tratamento minimo de erro e documentacao objetiva.

## Decisoes travadas

- Nao criar backend separado.
- Nao introduzir framework novo sem necessidade.
- Nao fazer reorganizacao ampla de pastas.
- Nao alterar comportamento fora de persistencia, estoque e financeiro essencial.
- Nao incluir operacoes de escrita de estoque/financeiro na UI nesta etapa minima.
- Preferir solucao conservadora em caso de duvida.

## Decisoes de ambiente local

- Execucao local deve usar Vercel CLI (`vercel dev`) para reproduzir o deploy.
- Nao usar stack adicional para ambiente local no v1 (sem Express, sem Docker).
- Projeto permanece sem `package.json` por decisao de simplicidade operacional.

## Seguranca local

- Segredos apenas em `.env.local` e variaveis de ambiente da Vercel.
- Nunca expor credenciais no frontend.
- Nunca versionar segredos no repositorio.

## Modelo de contribuicao

- Mudanca incremental, em branch dedicada.
- Commits pequenos e descritivos.
- Revisao e merge via Pull Request no repositorio oficial.
