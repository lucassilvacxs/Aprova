# APROVA — Plataforma Privada de Estudos para Concursos Públicos

> **Status:** FASE 8 Concluída (Redação Discursiva, Temas Inéditos, Editor Focado, Correção Oficial e Desempenho)  
> **Concursos Iniciais:** Polícia Rodoviária Federal (PRF) & Polícia Federal (PF)  
> **Arquitetura:** Domínio Multi-Concurso Agnóstico & Extensível  
> **Ambiente:** Privado (Invite-Only) com persistência real em PostgreSQL (Dual-Driver) e RBAC estrito

---

## 1. O que é o APROVA?

O **APROVA** é uma plataforma educacional web privativa voltada à preparação de alto rendimento para concursos públicos concorridos. Projetada com foco inicial nas carreiras policiais federais (PRF e PF), sua arquitetura foi concebida desde o primeiro dia para permitir a incorporação de novos concursos (Receita Federal, Tribunais, Polícias Civis, etc.) sem alteração de infraestrutura ou reescrita de código.

---

## 2. Principais Funcionalidades da Plataforma (Visão Geral)

- **Dashboard Personalizado:** Interface dark mode premium inspirada em produtos educacionais modernos, com 4 KPI cards em tons pastel, gráficos de evolução, recomendações pedagógicas e mini-calendário de frequência.
- **Domínio Multi-Concurso:** Entidade `Contest` genérica com vinculação de órgãos (`Agency`), bancas examinadoras (`ExamBoard`), cargos e etapas.
- **Banco de Questões Especializado:** Suporte aos formatos Certo/Errado (modelo Cebraspe com fator de penalidade) e Múltipla Escolha, filtros avançados e Caderno de Erros.
- **Simulados com Cronômetro:** Simulação realista de tempo de prova e cálculo analítico de notas líquidas e desempenho por disciplina.
- **Plano de Estudos Inteligente & Calendário Adaptativo:** Planejamento determinístico em horizonte de 4 semanas, ponderado por pesos de edital, fragilidades históricas do aluno, ciclo de repetição espaçada (D+1, D+7, D+14, D+30), reorganização adaptativa de sessões atrasadas e cronômetro de foco diário.
- **Área de Redação com IA:** Editor ergonômico com textos motivadores, contadores e pipeline desacoplado para correção pedagógica em 5 competências formais.
- **Notícias & Documentos Oficiais:** Rastreamento rigoroso de fontes oficiais (DOU, páginas institucionais, bancas) e leitor de editais em PDF.
- **Acesso Estritamente Privado:** Sistema de convites (*invite-only*) com prazo de validade e controle de permissões por perfil (ADMIN e ALUNO).

---

## 3. Stack Tecnológica

| Camada | Tecnologia | Propósito |
| :--- | :--- | :--- |
| **Linguagem** | TypeScript 5 (Strict Mode) | Tipagem ponta a ponta e prevenção de inconsistências em tempo de compilação |
| **Frontend** | React 19 + Vite 6 | SPA ultra-rápida otimizada para CDN global no Cloudflare Pages |
| **Estilização** | Tailwind CSS + Lucide Icons | Design System baseado em tokens dark slate e detalhes pastel |
| **Backend API** | Node.js 24 + Hono v4 | Framework HTTP ultraleve (<15KB) compatível com Cloudflare Workers |
| **ORM** | Drizzle ORM + Drizzle Kit | Mapeamento relacional SQL-first com tipagem estrita e zero overhead |
| **Banco de Dados** | PostgreSQL (Neon / Supabase) | Compatível com Cloudflare Hyperdrive para pooling de alta concorrência |
| **Armazenamento** | Cloudflare R2 / Storage Local | Armazenamento de PDFs de editais com taxa zero de saída de dados |
| **Camada de IA** | Strategy Pattern (`AIService`) | Suporte a Google Gemini, Claude, OpenAI ou Mock local para testes |
| **Testes** | Vitest | Execução ultrarrápida de testes unitários de domínio e regras de negócio |

---

## 4. Estrutura do Projeto

```
c:\Users\Lucas Silva\Documents\antigravity\FCon/
├── src/
│   ├── components/
│   │   ├── layout/             # Sidebar, Header e AppLayout
│   │   └── ui/                 # Primitivas (Button, Card, Badge)
│   ├── core/
│   │   ├── constants/          # Órgãos, bancas e parâmetros do sistema
│   │   ├── types/              # Contratos TypeScript do domínio (user, contest, etc.)
│   │   └── utils/              # Funções puras (cálculo Cebraspe, tempo, etc.)
│   ├── App.tsx                 # Raiz da aplicação e visualização da fundação
│   ├── index.css               # Estilos globais e tokens de cores
│   └── main.tsx                # Entrada do React 19
├── server/
│   ├── db/
│   │   ├── schema.ts           # Definição relacional do Drizzle ORM
│   │   ├── index.ts            # Conexão Drizzle com pool PostgreSQL
│   │   └── seed.ts             # Carga inicial com PRF, PF e Cebraspe (sem dados fictícios)
│   ├── services/
│   │   ├── ai/                 # Interface AIService e implementação Mock
│   │   └── storage/            # Interface StorageService e provedor Local
│   └── index.ts                # Servidor Hono com CORS, logging e healthcheck
├── tests/                      # Suíte de testes com Vitest
├── drizzle.config.ts           # Configuração do Drizzle Kit
├── tailwind.config.ts          # Tokens de design system (dark + pastel)
├── tsconfig.json               # Configuração TypeScript estrita
└── vite.config.ts              # Configuração Vite com alias @/
```

---

## 5. Como Instalar e Executar

### Pré-requisitos
- Node.js >= 20.x (ambiente atual validado em Node v24.14.0)
- npm >= 10.x (ambiente atual validado em npm v11.9.0)

### 1. Clonar e Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo para o `.env`:
```bash
cp .env.example .env
```

### 3. Comandos Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento do frontend (Vite em `http://localhost:5173`) |
| `npm run dev:server` | Inicia o servidor backend Hono em modo watch (`http://localhost:3000`) |
| `npm run build` | Compila o TypeScript e gera o bundle estático do frontend na pasta `/dist` |
| `npm run lint` | Executa a checagem estrita de tipos TypeScript sem emitir arquivos (`tsc --noEmit`) |
| `npm run test` | Executa a suíte completa de testes automatizados com Vitest (116 testes em 12 suítes) |
| `npm run db:migrate` | Executa as migrações SQL no banco de dados ativo |
| `npm run db:seed` | Popula o banco com Admin, Aluno Demo, PRF, PF, Cebraspe, Disciplinas e Progresso |
| `npm run db:generate` | Gera novas migrações SQL a partir das alterações no schema do Drizzle |
| `npm run db:push` | Aplica diretamente o schema no banco de dados configurado |

---

## 6. Credenciais de Demonstração (Seed)

Após executar `npm run db:seed`, os seguintes acessos estarão disponíveis:

| Perfil | Email | Senha | Concursos Vinculados | Acesso Administrativo |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador** | `admin@aprova.app` | `Admin@123456` | Todos (PRF e PF) | Sim (`/admin/*`) |
| **Aluno Demo** | `aluno@aprova.app` | `Aluno@123456` | PRF e PF | Não (apenas `/dashboard`, `/concursos`, etc.) |

---

## 7. Variáveis de Ambiente (`.env.example`)

```env
APP_NAME=APROVA
APP_ENV=development
APP_PORT=3000
APP_URL=http://localhost:5173

# Segurança & Autenticação
JWT_SECRET=aprova_super_secret_jwt_key_development_2026_secure_tokens
JWT_EXPIRATION=7d
INVITATION_SALT=aprova_salt_invite_keys_2026

# Banco de Dados (PGlite em WASM por padrão ou PostgreSQL remoto)
USE_PGLITE=true
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aprova_db

# Inteligência Artificial
AI_PROVIDER=mock
GEMINI_API_KEY=

# Armazenamento
STORAGE_PROVIDER=local
```
