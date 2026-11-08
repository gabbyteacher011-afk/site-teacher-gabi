# English Teacher Hub (site)

Sistema de gestão de aulas de inglês: área da professora, área do aluno, turmas e área dos responsáveis.
É um **site JavaScript comum** (sem framework): o build junta tudo em um único `index.html`, que conversa por HTTPS
com a **API** (Node.js + PostgreSQL), repositório `api-teacher-gabi`. O login é por e-mail e senha, criados pela professora.

## Como colocar para funcionar

1. Suba a API e o banco PostgreSQL (veja o README do repositório da API) e crie a conta da professora.
2. Edite `config.js` e informe o endereço da API:
   ```js
   window.APP_CONFIG = { apiUrl: "https://sua-api.exemplo.com", siteUrl: "https://gabbyteacher011-afk.github.io/site-teacher-gabi/" };
   ```
3. Na API, configure `CORS_ORIGIN=https://gabbyteacher011-afk.github.io` (só o domínio, sem o caminho).
4. Em **Settings → Pages**, escolha **Deploy from a branch → main → / (root)**.

Sem `apiUrl`, o site abre e avisa que ainda não está ligado ao servidor (não mostra dados falsos).

## Estrutura

```
.
├── index.html           site pronto (gerado por build.js)
├── config.js            endereço da API
├── src/                 código-fonte
│   ├── logic.js         regras puras (datas, financeiro, homework, painéis) – testadas
│   ├── ui.js            componentes e ícones
│   ├── core.js          estado, sincronização, publicação dos painéis, login
│   ├── api.js           comunicação com a API (sessão, consultas, arquivos)
│   ├── pages1..8.js     telas
│   ├── demo.js          dados de demonstração (removíveis)
│   ├── main.js          inicialização
│   └── style.css, head.html, logo.js
├── test/                logic.test.js (Node) e run*.py (Python + Playwright, com banco simulado)
└── build.js             gera index.html
```

## Desenvolvimento

```bash
npm test          # testes das regras
npm run build     # gera index.html (rode e envie o index.html novo depois de mexer em src/)
```

## Como os dados fluem

- A professora grava registros pela API (`/students`, `/lessons`…); a API os distribui nas tabelas do PostgreSQL.
- Ao salvar, o site publica o painel de cada aluno/responsável (`/portal/:id`); eles só leem o próprio painel.
- O site consulta a API a cada ~20 s (`pollSeconds` em `config.js`) e ao voltar para a aba; não há tempo real instantâneo.
- A sessão fica guardada no navegador (`localStorage`) até expirar ou o usuário clicar em **Sair**.

## Privacidade

O sistema guarda dados de alunos, inclusive menores de idade. Use HTTPS, escolha senhas fortes, hospede o banco com
backups e informe os responsáveis sobre o tratamento dos dados (LGPD).
