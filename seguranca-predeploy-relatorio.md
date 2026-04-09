# Relatorio Final de Varredura de Segredos (Pre-Deploy)

Data: 2026-04-06  
Escopo: `C:\laragon\www\encompasso` (raiz completa)  
Gate: rigor alto

## Resultado executivo
- Gate de deploy: **BLOQUEADO**
- Motivos principais:
  - Arquivos sensiveis ainda presentes no workspace (`chave-api.md`, `drive-api-test-492219-116806df9162.json`)
  - `.env.local` rastreado no Git no app `materiais-evento-v1` (indice atual e historico)
  - Evidencia de segredo explicito em documentacao (`chave-api.md`)

## Evidencias de auditoria Git (app alvo)
- Indice atual: `.env.local` aparece em `git ls-files`
- Historico: `.env.local` aparece em `git log --all --name-only`

## Relatorio padronizado
| arquivo_ou_padrao | risco | evidencia | acao_tomada | pendencia_usuario |
|---|---|---|---|---|
| `C:\laragon\www\encompasso\drive-api-test-492219-116806df9162.json` | alto | contem `private_key` e `client_email` | identificado e bloqueado no gate | revogar service account key no Google Cloud e gerar nova chave |
| `C:\laragon\www\encompasso\chave-api.md` | alto | contem API key (prefixo `AIza`) | identificado e bloqueado no gate | revogar API key e recriar com restricoes de uso |
| `C:\laragon\www\encompasso\materiais-evento-v1\.env.local` | alto | rastreado em indice e historico Git | identificado e bloqueado no gate | remover do indice Git, substituir por `.env.example`, rotacionar `GOOGLE_PRIVATE_KEY` |
| referencias de nome de variavel (`GOOGLE_PRIVATE_KEY`) em docs/codigo | baixo | ocorrencias em README/docs e `api/_sheets.js` sem valor exposto | mantido (aceitavel) | revisar textos para garantir ausencia de valores reais |

## Runbook proposto para remediacao de historico (NAO executado)
Pre-condicao: credenciais ja rotacionadas/revogadas.

1. Remover `.env.local` do indice atual sem apagar arquivo local:
```powershell
git -C C:\laragon\www\encompasso\materiais-evento-v1 rm --cached .env.local
```

2. Commit de higiene:
```powershell
git -C C:\laragon\www\encompasso\materiais-evento-v1 add .gitignore
git -C C:\laragon\www\encompasso\materiais-evento-v1 commit -m "security: stop tracking local env and tighten ignore rules"
```

3. Limpeza de historico (opcao A - `git filter-repo`, recomendado se instalado):
```powershell
git -C C:\laragon\www\encompasso\materiais-evento-v1 filter-repo --path .env.local --invert-paths
```

4. Limpeza de historico (opcao B - `git filter-branch`, fallback nativo):
```powershell
git -C C:\laragon\www\encompasso\materiais-evento-v1 filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env.local" --prune-empty --tag-name-filter cat -- --all
```

5. Publicacao apos limpeza:
```powershell
git -C C:\laragon\www\encompasso\materiais-evento-v1 push origin --force --all
git -C C:\laragon\www\encompasso\materiais-evento-v1 push origin --force --tags
```

6. Pos-acao obrigatoria:
- avisar equipe para re-clone/rebase limpo
- confirmar rotacao das credenciais no provedor (Google Cloud/Vercel)

## Observacao tecnica
`git filter-repo` nao esta disponivel no ambiente atual (`git: 'filter-repo' is not a git command`).
