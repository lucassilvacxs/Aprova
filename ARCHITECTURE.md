# Documento de Arquitetura Técnica — Plataforma APROVA

> **Versão:** 1.0.0 (Fase 1)  
> **Status:** Arquitetura Base Consolidada e Aprovada

---

## 1. Visão Geral da Arquitetura de Software

A plataforma **APROVA** adota uma arquitetura em camadas orientada a domínio (*Domain-Driven Layered Architecture*), com desacoplamento estrito entre apresentação, regras de negócio e infraestrutura externa.

```
┌─────────────────────────────────────────────────────────────┐
│                 Camada de Apresentação                      │
│   React 19 + TypeScript + Vite + Tailwind CSS + Lucide      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Fetch API / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Camada de Aplicação / API                   │
│   Hono v4 + Middlewares (CORS, Logger, ErrorHandler)        │
│   Validação com Zod + Controle de Sessão / RBAC             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Camada de Serviços & Domínio                │
│   ContestService, QuestionService, SimulationService        │
│   Regras de Pontuação Cebraspe (Certas - Erradas)           │
│   Matriz de Autorização (ADMIN vs ALUNO)                    │
└──────────────┬───────────────┬───────────────┬──────────────┘
               │               │               │
               ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────┐ ┌─────────────────────┐
│ AIService (Strategy)│ │Storage (R2) │ │ Drizzle ORM + PG    │
│ Gemini / Claude/Mock│ │Local / R2   │ │ PostgreSQL Pool     │
└─────────────────────┘ └─────────────┘ └─────────────────────┘
```

---

## 2. Princípio Arquitetural: Domínio Multi-Concurso

Uma das diretrizes inegociáveis do sistema é a **agnóstica estrutural**:

```
ERRADO (Acoplamento Rígido):
├── prf_questions / pf_questions
├── prf_subjects / pf_subjects
└── prf_news / pf_news

CORRETO (APROVA - Entidade Universal):
Agencies (Órgãos: PRF, PF, Receita)
    ↓
ExamBoards (Bancas: Cebraspe, FGV, Vunesp)
    ↓
Contests (Concursos: PRF 2026, PF 2026, RFB 2026)
    ├── Positions (Cargos: Policial Rodoviário, Agente, Escrivão)
    ├── ContestSubjects (Disciplinas exigidas com pesos)
    ├── Questions (Banco centralizado filtrável por concurso/banca)
    ├── Simulations (Simulados específicos)
    ├── Documents (Editais e retificações)
    └── News (Notícias oficiais tagueadas)
```

Nenhum arquivo, componente ou rota possui código atrelado exclusivamente à PRF ou PF. Qualquer novo concurso pode ser cadastrado pelo painel administrativo em tempo de execução.

---

## 3. Arquitetura do Banco de Dados Relacional

Modelado no Drizzle ORM (`server/db/schema.ts`) com normalização em 3FN:

1. **Gestão de Acesso & Auditoria:**
   - `users`: Identidade, hash de senha seguro, função (`admin` ou `student`) e lista de concursos autorizados (`allowed_contest_ids`).
   - `invitations`: Código único gerado por administradores, com prazo de expiração e vinculação de concursos permitidos.
   - `audit_logs`: Registro imutável de ações administrativas (criação, edição, bloqueios).

2. **Núcleo de Concursos:**
   - `agencies`: Órgãos públicos federais, estaduais e municipais.
   - `exam_boards`: Bancas examinadoras com estilo de pontuação (`cebraspe_negative_points` ou `standard_multiple_choice`).
   - `contests`: Instância de um concurso público com ano, status do edital e salário-base.
   - `positions`: Cargos, remuneração, requisitos e atribuições.
   - `contest_stages`: Etapas do certame (Objetiva, Discursiva, TAF, Psicológico, etc.).

3. **Estrutura Pedagógica & Questões:**
   - `subjects` e `topics`: Disciplinas e árvore de subassuntos com auto-relacionamento (`parent_id`).
   - `contest_subjects`: Associação entre concurso e disciplina com definição de peso e quantidade esperada de questões.
   - `questions` & `question_options`: Enunciados em Markdown, gabaritos, comentários explicativos e tags.
   - `question_attempts`: Registro detalhado de cada resolução do aluno (tempo gasto, opção escolhida, acerto/erro e fonte).

4. **Simulados & Desempenho:**
   - `simulations`: Configurações de simulados com tempo limite e fator de penalidade Cebraspe.
   - `simulation_attempts`: Consolidação da tentativa, nota líquida e detalhamento por disciplina.

5. **Redação Discursiva & IA:**
   - `essay_prompts`: Temas de redação com textos motivadores (1, 2 e 3) e instruções.
   - `essays`: Textos enviados pelo aluno com controle de rascunho, linhas e palavras.
   - `essay_corrections`: Avaliação detalhada nas 5 competências formais com trechos comentados e aviso legal pedagógico.

6. **Notícias & Documentos:**
   - `news_sources` & `news`: Rastreamento de notícias com distinção obrigatória entre fontes oficiais e informativas.
   - `documents`: Upload e indexação de editais, retificações, comunicados e gabaritos oficiais.

---

## 4. Estratégia de Autenticação & Sistema Privado (Invite-Only)

O cadastro público é terminantemente bloqueado. O fluxo de admissão ocorre em 5 etapas:

1. **Geração do Convite:** O Administrador gera um token criptográfico no painel administrativo, definindo validade (ex: 7 dias) e os concursos aos quais o aluno terá acesso.
2. **Recebimento do Link:** O usuário recebe a URL exclusiva contendo o token de convite.
3. **Validação Atômica:** A API valida se o convite existe, se seu status é `valid` e se não expirou.
4. **Criação de Conta:** A conta do aluno é persistida com senha cifrada (Argon2id/Bcrypt com salt round mínimo de 12), e o convite é marcado como `used` registrando o `used_by`.
5. **Emissão de Sessão:** A autenticação emite token JWT assinado transportado via cookies seguros `HttpOnly`, `SameSite=Lax` e flag `Secure` em produção.

---

## 5. Estratégia de Autorização (RBAC)

Separada estritamente da autenticação através da matriz de permissões (`src/core/types/permissions.ts`):

- **ADMIN:**
  - `create_contest`, `edit_contest`, `delete_contest`
  - `manage_users`, `manage_invitations`
  - `manage_questions`, `manage_simulations`, `manage_essays`
  - `manage_news`, `manage_documents`, `view_audit_logs`
- **ALUNO (STUDENT):**
  - `view_contest` (apenas para os concursos autorizados no seu cadastro)
  - `study_contents`, `answer_question`, `take_simulation`
  - `write_essay`, `view_news`, `view_documents`, `create_study_plan`

---

## 6. Camada de Inteligência Artificial Desacoplada

Implementada segundo o padrão **Strategy**:
A interface abstrata `AIService` (`server/services/ai/ai.interface.ts`) isola o sistema de fornecedores proprietários.

```typescript
export interface AIService {
  generateEssayTheme(params: GenerateThemeParams): Promise<Omit<EssayPrompt, 'id' | 'createdAt'>>;
  correctEssay(params: CorrectEssayParams): Promise<Omit<EssayEvaluation, 'id' | 'essayId' | 'createdAt'>>;
  analyzePerformance(params: AnalyzePerformanceParams): Promise<PerformanceInsights>;
  explainQuestion(params: ExplainQuestionParams): Promise<QuestionExplanationResult>;
  generateStudyPlan(params: GenerateStudyPlanParams): Promise<Partial<StudyPlan>>;
  summarizeContent(params: SummarizeContentParams): Promise<string>;
}
```

- **Provedor Primário (Planejado para Fase 14):** Google Gemini 2.0 via SDK `@google/genai`, aproveitando alta velocidade, saídas JSON estruturadas e ampla janela de contexto.
- **Provedor Mock (`MockAIProvider`):** Implementado e coberto por testes unitários para execução offline e testes determinísticos.

---

## 7. Estratégia de Deploy no Cloudflare

A plataforma foi arquitetada para usufruir da infraestrutura global de baixa latência do Cloudflare:

1. **Frontend (Cloudflare Pages):**
   - O bundle estático gerado pelo Vite é servido em centenas de data centers no Edge.
   - Cache global de assets imutáveis com compressão Brotli e suporte a HTTP/3.
2. **Backend API (Cloudflare Workers / Pages Functions):**
   - O Hono foi escolhido especificamente por ter overhead mínimo (<15KB) e executar nativamente no runtime V8 do Cloudflare Workers sem emulação de Node.js pesada.
3. **Aceleração de Conexões (Cloudflare Hyperdrive):**
   - Reduz a latência de consultas SQL conectando o Edge ao PostgreSQL gerenciado (Neon / Supabase) por meio de connection pooling distribuído.
4. **Armazenamento de Arquivos (Cloudflare R2):**
   - Custos previsíveis e zero taxa de egresso para download de apostilas, provas anteriores e editais em PDF.

---

## 8. Decisões Técnicas Tomadas na Fase 1

| Decisão | Alternativa Descartada | Justificativa |
| :--- | :--- | :--- |
| **React 19 + Vite + Hono** | Next.js 15 Monolítico | Next.js possui atritos frequentes com o runtime restrito do Cloudflare Workers e gera dependências pesadas. O combo Vite (Pages) + Hono (Workers) é mais leve, mais rápido e tem compatibilidade nativa de 100% com o Edge. |
| **Drizzle ORM** | Prisma ORM | Prisma gera binários Rust pesados (query engine) problemáticos no Edge e com alto consumo de memória. O Drizzle é SQL-first, zero runtime overhead e 10x mais rápido. |
| **Strategy Pattern para IA** | Acoplamento direto à OpenAI ou Gemini | Permite alternar modelos ou provedores conforme variações de preço, performance ou cotas sem tocar no código das telas de redação. |
| **Acesso Invite-Only** | Cadastro aberto com aprovação manual | Evita sobrecarga de spambots e assegura a privacidade estrita do grupo inicial de estudos. |

---

## 9. Consolidação da Fase 3 — Banco de Dados, Backend, Autenticação e Persistência Real

### 9.1 Driver de Banco de Dados Híbrido (Dual-Mode Driver)
Para assegurar desenvolvimento local sem necessidade de serviços externos e ao mesmo tempo permitir deploy em nuvem com PostgreSQL gerenciado (Neon / Supabase / Hyperdrive), foi implementado o `server/db/index.ts`:
- **Em testes e desenvolvimento local:** Utiliza `@electric-sql/pglite` (PostgreSQL compilado para WebAssembly), executando PostgreSQL real com suporte a UUIDs, Foreign Keys e Índices diretamente no Node.js (em memória para testes paralelos ou persistente em `./data/aprova_db` no desenvolvimento local).
- **Em produção / staging:** Utiliza `node-postgres` com `pg.Pool` conectado via connection string padrão (`DATABASE_URL`).

### 9.2 Autenticação & Sessão (JWT + Bcrypt)
- **Hash de Senha:** Bcrypt com fator de custo (`saltRounds = 10`), garantindo resistência a ataques de força bruta.
- **Tokens de Acesso:** JSON Web Tokens (JWT) assinados via HMAC-SHA256 (`HS256`), com validade de 7 dias e claims mínimas (`sub`, `email`, `role`, `exp`).
- **Proteção contra Enumeração:** Mensagens de erro padronizadas e genéricas (`"Credenciais inválidas. Verifique o email e a senha informados."`) para impedir descoberta de usuários cadastrados.
- **Bloqueio em Tempo Real:** Validação direta da coluna `users.status` no middleware de autenticação. Usuários com status `'blocked'` ou `'inactive'` recebem HTTP 403 mesmo portando JWT válido.

### 9.3 Controle de Acesso Baseado em Papéis (RBAC)
- Papéis definidos: `admin` (Administrador com privilégios irrestritos) e `student` (Aluno com acesso limitado a estudos).
- Middleware `requireRole('admin')` protege rotas administrativas (`/api/v1/admin/*`), bloqueando alunos com HTTP 403.
- Tabela `role_permissions` desacopla papéis de ações específicas, permitindo granularidade para fases futuras.

### 9.4 Sistema de Convites Exclusivo (Invite-Only)
- Novos usuários só podem ingressar na plataforma por meio de um código de convite gerado por um administrador.
- Regras de validação do convite: verificação de expiração (`expires_at > NOW()`), contagem de usos (`used_count < max_uses`) e status ativo.
- O endpoint `/api/v1/auth/register-with-invite` executa uma transação atômica que cria o usuário, atribui o papel especificado no convite, vincula os concursos autorizados e incrementa o contador do convite.

### 9.5 Isolamento Estrito de Dados (Data Privacy / Ownership)
- As rotas de progresso e dashboard (`/api/v1/dashboard`, `/api/v1/contests/subjects/list`) filtram todas as consultas SQL exclusivamente pelo `user.id` extraído do JWT verificado no middleware.
- Alunos não conseguem visualizar, inferir ou listar desempenhos de outros estudantes. Alunos têm acesso somente aos concursos presentes em `allowed_contest_ids` (caso restrito) ou a todos os concursos públicos ativos.

---

## 10. Consolidação da Fase 4 — Estrutura Pedagógica, Cursos, Aulas e Progresso

### 10.1 Hierarquia Pedagógica Completa
A plataforma implementa a seguinte cadeia relacional estrita:
```
CONCURSO (ex: PRF, PF)
  └── DISCIPLINAS (ex: Legislação de Trânsito, Direito Penal)
        └── ASSUNTOS / TÓPICOS (ex: Crimes de Trânsito)
              └── CURSOS (ex: Legislação de Trânsito Completa)
                    └── MÓDULOS (ex: Módulo 1 - Disposições Preliminares)
                          └── AULAS (ex: Aula 1 - Estrutura do CTB)
                                ├── CONTEÚDO (Markdown rico com Callouts/Alerts)
                                ├── MATERIAIS COMPLEMENTARES (PDFs, Links, Leis)
                                └── PROGRESSO (user_lesson_progress persistido)
```

### 10.2 Regras de Publicação e Visibilidade (Draft vs Published vs Archived)
- **Draft (`draft`):** Visível unicamente para Administradores no painel de gestão (`/admin/cursos/:id`). Alunos recebem HTTP 404/403 ao tentar acessar qualquer aula ou curso em rascunho.
- **Published (`published`):** Visível para Alunos no portal de estudos (`/concursos`, `/disciplinas`, `/cursos/:id`, `/aulas/:id`).
- **Archived (`archived`):** Soft delete pedagógico. O item não é excluído fisicamente do banco de dados, preservando a integridade referencial dos registros de progresso e histórico dos alunos.

### 10.3 Reordenação Sequencial e Atômica
- Módulos e aulas possuem o campo `order_index` indexado.
- Endpoints `PATCH /api/v1/modules/:id/reorder` e `PATCH /api/v1/lessons/:id/reorder` executam a troca posicional (`up`/`down`) em transação atômica (`db.transaction`), impedindo colisões de índice.

### 10.4 Persistência de Progresso e Card "Continue Estudando"
- O progresso de cada aula é gravado na tabela `user_lesson_progress` com índice único composto `(user_id, lesson_id)` e data de conclusão `completed_at`.
- A rota `POST /api/v1/progress/lessons/:id/toggle` é idempotente e reversível: marcar conclui a aula e desmarcar retorna o status para pendente, recalculando atomicamente o percentual de conclusão do curso, módulo, disciplina e concurso.
- A rota `GET /api/v1/progress/continue` analisa a última aula acessada/pendente do aluno ou a primeira aula disponível do concurso ativo, preenchendo o card do Dashboard em tempo real.

---

## 11. Consolidação da Fase 5 — Banco de Questões, Resolução, Filtros e Desempenho

### 11.1 Arquitetura Universal do Banco de Questões
A plataforma implementa um banco de questões universal, estritamente desacoplado de órgãos específicos, organizado na hierarquia:
```
CONCURSO (opcional) ──> DISCIPLINA ──> ASSUNTO / TÓPICO ──> QUESTÕES ──> OPÇÕES
```
- **Tabelas Principais:** `questions`, `question_options`, `question_attempts`, `question_favorites`, `question_review_flags`, `question_reports`.
- **Classificação:** Suporta nível de dificuldade (`easy`, `medium`, `hard`, `very_hard`), formato (`multiple_choice`, `true_false`), ano, banca examinadora (`exam_boards`) e fonte (`BANCA_OFICIAL`, `QUESTAO_AUTORAL`, `IMPORTADA`, `DEMO`, `OUTRA`).

### 11.2 Anti-Cheat Pedagógico
- Nas consultas de questões por alunos (`GET /api/v1/questions/:id`), caso o aluno não possua tentativa prévia registrada, o backend remove o atributo `isCorrect` das opções e oculta o `officialExplanation` (retornando `null`).
- O gabarito e o comentário oficial só são liberados após a submissão formal da tentativa via `POST /api/v1/questions/:id/attempt`.
- Administradores têm acesso irrestrito ao gabarito e explicação para fins de auditoria e edição.

### 11.3 Ciclo de Vida da Questão (Draft vs Published vs Archived)
- **Draft (`draft`):** Criada por administradores ou gerada via duplicação. Oculta da visão do aluno (retorna HTTP 404 em consultas diretas por alunos).
- **Published (`published`):** Questão liberada para treino no banco público da plataforma.
- **Archived (`archived`):** Soft delete seguro. Registra `archived_at` e preserva histórico prévio de tentativas dos alunos sem perder integridade relacional.

### 11.4 Resolução, Desempenho e Métricas Reais
- Ao submeter `POST /api/v1/questions/:id/attempt`, o backend:
  1. Valida se a alternativa pertence à questão e se é a correta.
  2. Insere a tentativa com cronometragem em segundos (`duration_seconds`).
  3. Atualiza atomicamente `user_subject_progress` para a disciplina associada (acertos, erros, taxa %).
  4. Atualiza atomicamente `user_progress` caso a questão esteja vinculada a um concurso.
- O endpoint `GET /api/v1/questions/stats` entrega agregações reais por disciplina, banca e dificuldade.

### 11.5 Motor Algorítmico de Recomendação de Questões
- O serviço `QuestionRecommendationService` opera com lógica determinística e estritamente baseada em regras pedagógicas, sem dependência externa de IA:
  1. Prioridade 1: Questões sinalizadas manualmente para revisão pelo aluno (`question_review_flags`).
  2. Prioridade 2: Questões erradas em tentativas recentes para reforço de fixação no caderno de erros.
  3. Prioridade 3: Questões inéditas em disciplinas cujo rendimento histórico do aluno esteja abaixo de 70%.
  4. Fallback: Questões inéditas do concurso ativo para ampliação de repertório.

---

## 12. Consolidação da Fase 6 — Simulados Completos, Provas Personalizadas e Modo Exame

### 12.1 Modelo Relacional e Tipos de Simulado
A arquitetura de simulados é 100% genérica e multi-concurso:
```
simulations (FIXED, RANDOM, CUSTOM)
    ├── simulation_questions (questões vinculadas, ordem e pontuação)
    └── simulation_attempts (tentativas do aluno, cronômetro, status)
            └── simulation_answers (respostas atômicas, autosave, tempo)
```
- **FIXED (Simulado Fixo/Oficial):** Questões curadas manualmente pelo Administrador com ordem fixa ou ponderada por disciplina.
- **RANDOM (Simulado Aleatório):** Gerado pelo Administrador ou Aluno com sorteio dinâmico respeitando filtros de banca, ano e dificuldade.
- **CUSTOM (Monte seu Simulado):** Wizard do estudante com seleção granular de disciplinas, tópicos e tempo, com validação prévia de disponibilidade via `SimulationQuestionSelectionService.countAvailableQuestions`.

### 12.2 Algoritmo Anti-Repetição
A seleção de questões para simulados prioriza:
1. **Tier 1 (Inéditas):** Questões que o aluno nunca resolveu.
2. **Tier 2 (Erros Anteriores):** Questões que o aluno errou anteriormente (reforço).
3. **Tier 3 (Marcadas para Revisão):** Questões marcadas com flag de revisão.
4. **Tier 4 (Outras já resolvidas):** Questões já acertadas apenas se o pool for insuficiente.
- Dentro de cada tier é aplicado shuffle pseudo-aleatório de Fisher-Yates para garantir variedade e imprevisibilidade.

### 12.3 Modo Exame e Proteção Anti-Cola (Anti-Cheat Server-Side)
- O payload de exame (`GET /api/v1/simulations/:id/attempt`) oculta estritamente o atributo `isCorrect` das alternativas e o texto explicativo `officialExplanation`.
- Nenhum dado de gabarito ou comentário trafega pela rede ou reside no frontend até a conclusão formal ou expiração do simulado.
- Administradores têm acesso total nas rotas de edição administrativa.

### 12.4 Cronômetro Autoritativo do Servidor & Auto-Save
- O tempo restante é calculado com base no carimbo do servidor: `startedAt + durationMinutes * 60 * 1000`.
- Se o tempo expirar durante a prova, qualquer interação subsequente aciona `autoExpireAttempt`, encerrando a prova automaticamente como `EXPIRED` e calculando o resultado.
- Cada resposta selecionada pelo aluno é persistida atomicamente via `POST /api/v1/simulations/:id/attempt/answer`, sobrevivendo a recarregamentos de página, quedas de conexão ou fechamento acidental da aba.
- Questões marcadas para revisão são persistidas em tempo real (`markedQuestions` no attempt).

### 12.5 Motor de Correção e Pontuação Dupla
O `SimulationScoringService` implementa:
- **Regra Cebraspe (1 erro anula 1 acerto):**
  $$\text{Pontuação Líquida} = \text{Acertos} - (\text{Erros} \times \text{Fator})$$
  *(com piso zero ou pontuação negativa conforme configuração de edital).*
- **Regra Padrão (Sem Penalidade):**
  $$\text{Pontuação Líquida} = \text{Acertos}$$
- **Diagnóstico Granular:**
  - Desempenho detalhado por Disciplina (pontos, acertos, erros, em branco, % de aproveitamento).
  - Tópicos Fortes ($\ge 70\%$) vs Tópicos que Requerem Atenção ($< 70\%$).
  - Desempenho por Nível de Dificuldade (Fácil, Médio, Difícil).

### 12.6 Pós-Prova & Revisão Completa
- Apenas após `COMPLETED` ou `EXPIRED`, o endpoint `GET /api/v1/simulations/attempts/:attemptId/result` revela o gabarito oficial comentado questão por questão, permitindo filtro rápido por erradas, acertadas e em branco.
- Histórico completo e evolução gráfica persistidos e refletidos no Dashboard do aluno (`simulationsCompleted`, `bestSimulationPercentage`).

---

## 13. Consolidação da Fase 7 — Plano de Estudos Inteligente, Calendário, Rotina e Distribuição Adaptativa

### 13.1 Modelo Relacional de Planejamento e Rotina
A arquitetura de planejamento de estudos é orientada a horizontes determinísticos (4 semanas = 28 dias), com persistência real em 7 tabelas normalizadas:
```
study_plans (userId, contestId, name, status, weeklyHours, dailyMinutes, strategy)
    ├── study_availabilities (dia da semana 0-6, horários, minutos disponíveis)
    ├── study_plan_preferences (duração min/max de sessão, intervalos, metas de questões)
    ├── study_plan_subjects (disciplinas do plano, pesos de edital, prioridade)
    ├── study_plan_topics (tópicos específicos e prioridades)
    ├── study_plan_sessions (grade diária de sessões, tipo, duração, status, justificativa)
    └── study_plan_reviews (ciclo de revisões espaçadas D+1, D+7, D+14, D+30)
```

### 13.2 Algoritmo Pedagógico Determinístico e Explicável
O motor de geração (`StudyPlanRecommendationService` & `StudyPlanGenerationService`) calcula prioridades e aloca blocos de estudo sem dependência de APIs externas de IA:
1. **Fórmula de Prioridade Ponderada:**
   $$\text{Score} = (\text{Peso do Edital} \times 20) + \text{Bônus de Prioridade} + \text{Score de Fragilidade} + \text{Score de Aulas Pendentes}$$
2. **Balanceamento com Travas de Segurança (Floor & Ceiling):**
   - Nenhuma disciplina pode receber menos de 5% (`minSubjectShare`) ou mais de 40% (`maxSubjectShare`) da carga semanal.
3. **Alternância Pedagógica Intercalada:**
   - Alterna sessões de Teoria (`LESSON`) com Prática de Fixação (`QUESTIONS`).
   - Sessões de final de semana alocam automaticamente simulados cronometrados (`SIMULATION`).
4. **Justificativa Explicável:**
   - Cada sessão gerada armazena em `explanation` o motivo humano e pedagógico pelo qual foi agendada naquele horário e dia.

### 13.3 Ciclo de Revisão Espaçada (Spaced Repetition)
- Ao concluir uma sessão do tipo `LESSON`, o serviço `StudyPlanSessionService` marca o progresso em `user_lesson_progress` e aciona `StudyPlanReviewService.scheduleSpacedReviews`.
- São agendadas revisões em D+1, D+7, D+14 e D+30 vinculadas à matéria e aula concluída.

### 13.4 Reorganização Adaptativa de Sessões Atrasadas
- O motor `StudyPlanAdjustmentService` identifica sessões pendentes com data anterior à data atual (`sessionDate < today`).
- Nunca altera ou apaga o histórico de sessões já concluídas.
- Redistribui as sessões atrasadas para os próximos 21 dias que possuam capacidade ociosa de horário configurada na disponibilidade do aluno.

### 13.5 Métricas de Aderência e Diagnóstico de Consistência
- O `StudyPlanStatsService` calcula:
  - Taxa de Aderência (`adherenceRate`): baseada nas sessões concluídas vs esperadas.
  - Horas planejadas vs horas efetivamente estudadas.
  - Detalhamento de cumprimento e progresso por disciplina.
  - Diagnóstico de consistência com 4 faixas (`EXCELLENT`, `GOOD`, `NEEDS_ATTENTION`, `CRITICAL`).
  - Recomendações pedagógicas orientadas a ação.

### 13.6 Isolamento Estrito de Dados (Multi-Tenant User Isolation)
- Todo o módulo de planos de estudos valida estritamente a posse do plano (`studyPlans.userId === user.id`).
- Um estudante nunca tem visibilidade ou capacidade de mutação sobre o planejamento de outro aluno.

---

## 14. Consolidação da Fase 8 — Redação, Temas, Escrita, Correção e Desempenho

### 14.1 Modelo Relacional e Normalizado de Redação
O módulo de Redação Discursiva conta com persistência relacional normalizada em 6 tabelas no banco de dados local:
```
essay_prompts (id, contestId, title, category, statement, instructions, context, difficulty, minWords, maxWords, minLines, maxLines, status)
    ├── essay_criteria (id, contestId, name, description, maxScore, weight, ordering, active)
    ├── essays (id, userId, promptId, contestId, title, content, wordCount, characterCount, lineCount, status, startedAt, lastSavedAt, submittedAt)
    │     ├── essay_versions (id, essayId, content, wordCount, characterCount, savedAt)
    │     └── essay_corrections (id, essayId, correctionType, totalScore, maxScore, percentage, generalFeedback, strengths, weaknesses, suggestions, correctedBy)
    │           └── essay_correction_criteria (id, correctionId, criterionId, score, feedback)
```

### 14.2 Motor de Pontuação Ponderada de Bancas (Cebraspe/FGV/Vunesp)
O cálculo formal e autoritativo de notas é executado no backend por `EssayScoringService`:
- Ponderação aritmética rigorosa por critério e peso:
  $$\text{Total Score} = \sum (\text{score}_i \times \text{weight}_i)$$
  $$\text{Max Score} = \sum (\text{maxScore}_i \times \text{weight}_i)$$
  $$\text{Aproveitamento (\%)} = \left(\frac{\text{Total Score}}{\text{Max Score}}\right) \times 100$$
- Classificação formal por faixa de aprovação:
  - `EXCELLENT` ($\ge 90\%$)
  - `GOOD` ($\ge 75\%$)
  - `AVERAGE` ($\ge 50\%$) - Aprovado
  - `INSUFFICIENT` ($< 50\%$) - Abaixo do corte
- Validação estrita: notas negativas ou que excedam a pontuação máxima do critério são terminantemente rejeitadas com erro 400.

### 14.3 Sorteador Determinístico Não Repetitivo de Temas
Implementado em `EssayThemeGeneratorService`:
- Analisa o histórico de redações do estudante (`essays.userId === userId`).
- Filtra temas disponíveis para o concurso ou categoria selecionada.
- Prioriza temas que o estudante ainda **nunca escreveu**.
- Se todos já foram praticados, seleciona o tema com a data de escrita mais antiga, garantindo ciclo rotativo sem repetição precoce.

### 14.4 Ciclo de Escrita, Autosave e Bloqueio de Integridade
- **Início e Rascunho Único:** O estudante inicia uma proposta ou retoma um rascunho em aberto (`GET /api/v1/essays/active-draft`).
- **Autosave com Métricas em Tempo Real:** Debounce no frontend e cálculo automático no backend de caracteres, palavras e linhas reais formatadas para padrão de concurso (~70 caracteres/linha).
- **Snapshot de Versões:** Cada salvamento grava uma versão histórica em `essay_versions`.
- **Bloqueio Pós-Submissão:** Ao submeter (`POST /api/v1/essays/:id/submit`), o status transiciona para `SUBMITTED`, o texto é congelado e qualquer tentativa posterior de edição via autosave é bloqueada com erro 400.
- **Auto-conclusão no Plano de Estudos:** Se o estudante possuir uma sessão de estudo do tipo `ESSAY` programada para a data corrente, ela é automaticamente concluída pelo serviço.

### 14.5 Bancada de Avaliação Oficial (Admin)
- **Fila de Correção:** Administradores visualizam envios em fila (`GET /api/v1/admin/essays`), com filtros por status (`SUBMITTED`, `UNDER_REVIEW`, `CORRECTED`), data de envio, extensão e estudante.
- **Bancada Split-Screen:** Interface dividida com visualização do texto original do aluno à esquerda e painel de notas à direita.
- **Notas Granulares & Parecer:** Avaliação critério a critério com justificativas individuais, além de parecer geral obrigatório, pontos fortes, aspectos a melhorar e orientações de estudo.
- **Auditoria & Notificação:** Ao salvar a correção, o status da redação muda para `CORRECTED`, um registro imutável é gravado em `audit_logs` e uma notificação interna é enviada ao aluno.

### 14.6 Painel de Desempenho & Recomendações Pedagógicas
- **Evolução Histórica:** Média geral, taxa de aprovação, melhor nota e gráfico cronológico de evolução.
- **Detalhamento por Competência:** Identificação das competências mais fortes e daquelas com maior perda de pontos.
- **Diagnóstico Algorítmico:** Diagnóstico pedagógico explicável com plano de ação acionável e recomendação de temas direcionados para superar fraquezas.





