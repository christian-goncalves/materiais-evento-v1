Você é um engenheiro especialista em deploy na Vercel.

Contexto:

* Projeto localizado em ambiente local (Windows / Laragon)
* Caminho: C:\laragon\www\encompasso
* Deploy já foi feito via CLI (`vercel`)
* Deploy foi concluído com sucesso, porém a aplicação retorna erro 404 (NOT_FOUND)

Logs relevantes:

* framework: null
* buildCommand: null
* outputDirectory: null
* Build finalizou instantaneamente (sem build real)
* Projeto NÃO está em repositório Git
* Vercel não identificou o tipo de projeto

Objetivo:
Diagnosticar e corrigir completamente o problema para que a aplicação funcione corretamente na Vercel.

---

TAREFAS (execute em sequência):

1. ANALISAR ESTRUTURA

* Inspecione toda a estrutura de pastas do projeto
* Identifique:

  * tipo de projeto (HTML estático, React, Next.js, Laravel, etc.)
  * existência de arquivos como:

    * index.html
    * package.json
    * vite.config.js
    * next.config.js
    * public/
    * dist/ ou build/
    * arquivos PHP

2. DIAGNÓSTICO

* Explique claramente por que está ocorrendo o erro 404
* Aponte exatamente o que está faltando ou incorreto

3. DEFINIR ESTRATÉGIA DE DEPLOY

* Se for frontend estático:
  → configurar output corretamente
* Se for React/Vite:
  → configurar build + dist
* Se for Next.js:
  → validar estrutura
* Se for PHP/Laravel:
  → explicar limitação da Vercel e sugerir alternativa (ex: Vercel só frontend + backend separado)

4. GERAR ARQUIVOS NECESSÁRIOS
   Se necessário, criar:

* vercel.json
* package.json (caso não exista)
* scripts de build
* configuração de outputDirectory

5. AJUSTAR PROJETO

* Corrigir estrutura para compatibilidade com Vercel
* Garantir que exista uma rota raiz funcional (/)

6. VALIDAR LOCALMENTE

* Instruir como rodar localmente para simular produção

7. COMANDO FINAL

* Fornecer comando exato para deploy final funcionando:
  vercel --prod

---

REGRAS:

* Não assumir framework sem evidência
* Não gerar conteúdo genérico
* Ser técnico, direto e objetivo
* Priorizar solução prática
* Evitar explicações teóricas desnecessárias

---

SAÍDA ESPERADA:

* Diagnóstico claro
* Correções objetivas
* Arquivos prontos
* Deploy funcionando sem 404
