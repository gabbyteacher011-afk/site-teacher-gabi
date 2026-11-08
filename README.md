# English Teacher Hub

Sistema de gestão de aulas de inglês: área da professora, área do aluno, turmas e área dos responsáveis.
Escrito em JavaScript puro (sem framework). O build junta tudo em **um único `index.html`**.

## Estrutura

```
.
├── src/                 código-fonte
│   ├── logic.js         regras puras (datas, financeiro, homework, painéis) – testadas
│   ├── ui.js            componentes e ícones
│   ├── core.js          dados, sincronização, publicação dos painéis
│   ├── pages1..8.js     telas (alunos, aulas, homework, financeiro, biblioteca, contratos, portal, responsáveis)
│   ├── demo.js          dados de demonstração (removíveis)
│   ├── main.js          inicialização
│   ├── style.css, head.html, logo.js
├── db/schema.sql        esquema relacional (PostgreSQL) para a versão com banco próprio
├── test/                testes (logic.test.js em Node; run*.py em Python + Playwright)
├── build.js             gera index.html
├── package.json
└── .github/workflows/pages.yml   publica no GitHub Pages a cada push na main
```

## Rodar e publicar

```bash
npm test          # testes das regras
npm run build     # gera index.html
```

Publicar: em **Settings → Pages**, escolha **Deploy from a branch → main → / (root)**. O Pages serve o `index.html` da raiz. Depois de mexer em `src/`, rode `npm run build` e envie o `index.html` novo.

## IMPORTANTE: o que falta para funcionar fora do Claude

O site foi feito para rodar dentro do Claude, que fornece **login, banco de dados e armazenamento de arquivos**
(`window.claude`: `user`, `db`, `assets`). O GitHub Pages só hospeda arquivos estáticos e **não tem nada disso**.
Publicado como está, o site abre, mas mostra a tela "Abra a página pelo Claude" e **não guarda nem mostra dados**.

Para funcionar no GitHub Pages é preciso um backend externo (por exemplo Supabase ou Firebase) e trocar a camada
de dados em `src/core.js` (objeto `NS` + `main.js`), que hoje fala com `window.claude`, por chamadas a esse serviço:

| Hoje (Claude)            | Substituir por                                   |
|--------------------------|--------------------------------------------------|
| `NS.user` (login, id)    | login por e-mail/Google do serviço escolhido     |
| `NS.db` (documentos)     | tabelas de `db/schema.sql` + regras de acesso    |
| `NS.assets` (arquivos)   | armazenamento de arquivos do serviço             |

Sem essa troca, não publique para alunos.
