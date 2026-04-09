# Checklist Operacional de Segurança Pré-Deploy

Status permitido: `PENDENTE | OK | FALHOU`

## 1) Contenção imediata
- [ ] `FALHOU` Revogar e recriar credenciais expostas (`chave-api.md`, `drive-api-test-492219-116806df9162.json`, `.env.local`).
- [ ] `PENDENTE` Atualizar variáveis seguras no provedor de deploy (ex.: Vercel).
- [ ] `PENDENTE` Atualizar ambiente local com novas credenciais sem versionar segredos.

## 2) Higiene de arquivos
- [x] `OK` Ajustar `.gitignore` para bloquear `.env*`, `.vercel/` e chaves JSON sensíveis.
- [ ] `PENDENTE` Remover/mover arquivos sensíveis para fora do repositório ativo.
- [ ] `FALHOU` Confirmar ausência de segredos em arquivos de documentação.

## 3) Auditoria Git local
- [x] `OK` Verificar se arquivos sensíveis estão rastreados no índice atual.
- [x] `OK` Verificar histórico local por ocorrência de segredos/arquivos sensíveis.
- [x] `OK` Registrar evidências (comandos e resultados).

## 4) Varredura final de segredos
- [x] `OK` Executar varredura com padrões de chave privada/API key.
- [x] `OK` Classificar risco por achado (`alto/médio/baixo`).
- [x] `OK` Definir ação tomada por item e pendências remanescentes.

## 5) Gate de deploy
- [ ] `FALHOU` Confirmar ausência de segredos em tree e staging.
- [ ] `PENDENTE` Confirmar env vars válidas no ambiente de produção.
- [ ] `FALHOU` Liberar deploy apenas com checklist crítico em `OK`.
