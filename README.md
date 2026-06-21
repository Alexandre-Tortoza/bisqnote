# BisqNote

**Espaços de colaboração privados, efêmeros e criptografados de ponta a ponta.**

BisqNote é uma plataforma de colaboração em equipe que prioriza **privacidade** e **anonimato**. Crie boards compartilhados com kanban, calendário, chat, mural, enquetes, notas de reunião e arquivos, sem trackers, sem expor seus dados ao servidor.

---

## O problema

Ferramentas de colaboração como Notion, Trello, Miro e Google Workspace exigem cadastro, armazenam seus dados no servidor e os retêm indefinidamente. Isso significa que:

- Você precisa criar uma conta e fornecer dados pessoais
- O provedor tem acesso a todo o conteúdo dos seus boards
- Os dados permanecem armazenados mesmo após o fim do projeto
- Há rastreamento, telemetria e análise de uso

## A solução

BisqNote resolve isso sendo:

- **Criptografado de ponta a ponta** — todo o conteúdo é criptografado no cliente com AES-256-GCM antes de ser enviado ao servidor. O servidor nunca vê os dados em texto puro.
- **Efêmero** — boards podem ser descartáveis. Quando se vão, se foram.
- **Zero confiança** — a criptografia é derivada da senha do board via PBKDF2. Sem senha, nem o operador do servidor acessa o conteúdo.
- **Sem trackers** — sem telemetria, sem analytics, sem coleta de dados.

---

## Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| **Kanban** | Quadro de tarefas com colunas, arrastar para reposicionar, atribuição, estimativa de esforço e datas de vencimento. |
| **Calendário** | Calendário compartilhado com eventos, notificações e recorrência. |
| **Chat** | Chat em grupo em tempo real via WebSockets. |
| **Mural** | Mural colaborativo com notas adesivas. |
| **Arquivos** | Upload de arquivos criptografados e compartilhamento de links externos. |
| **Go-back link** | Link de recuperação enviado por e-mail para donos de board que perderem o acesso. |

### Tipos de board

- **Público** — qualquer pessoa com o link pode entrar.
- **Privado** — protegido por senha. A senha deriva a chave de criptografia.

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Vue 3 + Vite + TypeScript (strict) + Pinia + Tailwind CSS |
| **Backend** | Node.js + Fastify 5 + TypeScript (strict) |
| **Banco de dados** | PostgreSQL 17 via Drizzle ORM |
| **WebSockets** | `@fastify/websocket` (chat, kanban, calendário) |
| **Criptografia** | AES-256-GCM + PBKDF2 (Web Crypto API) |
| **Deploy** | Docker + Kamal |
| **Testes** | Vitest (unit), Playwright (E2E) |

---

## Arquitetura

```
bisqnote/
├── frontend/          # Vue 3 SPA
│   └── src/
│       ├── features/  # Módulos por funcionalidade (public, board, support)
│       ├── components/# Componentes compartilhados (ui, layout, forms)
│       ├── stores/    # Stores globais (tema, sessão, locale)
│       ├── services/  # Cliente HTTP
│       └── locales/   # Traduções (en, pt-BR)
├── backend/           # Fastify API
│   └── src/
│       ├── domain/    # Entidades, casos de uso, interfaces (Clean Architecture)
│       └── infra/     # Rotas HTTP, banco, serviços (Drizzle, Nodemailer)
└── config/            # Deploy (Kamal, Docker)
```

O backend segue **Clean Architecture**: casos de uso e entidades no centro (puramente TypeScript, sem framework), com infraestrutura (Fastify, Drizzle, Nodemailer) na camada externa. As dependências sempre apontam para dentro.

O frontend segue **arquitetura modular por funcionalidade**: cada feature é autocontida com seus próprios componentes, composables, views e testes.

---

## Desenvolvimento

### Pré-requisitos

- Node.js 22+
- pnpm
- PostgreSQL 17 (ou Docker)

### Backend

```bash
cd backend
pnpm install
pnpm dev                # servidor em http://localhost:3000
pnpm test               # testes unitários
pnpm db:migrate         # aplicar migrações
pnpm db:seed            # dados de desenvolvimento
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev                # servidor em http://localhost:5173
pnpm build              # type-check + build
pnpm test:unit          # testes unitários
pnpm test:e2e           # testes end-to-end (Playwright)
pnpm lint               # lint (Oxlint + ESLint)
```

---

## Licença

AGPL-3.0 © BisqNote
