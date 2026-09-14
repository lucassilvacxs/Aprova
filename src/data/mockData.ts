// ─────────────────────────────────────────────
// APROVA — Mock Data Layer (DEMO ONLY)
// Todos os dados aqui são demonstrativos.
// Nenhum valor representa dado oficial ou real.
// ─────────────────────────────────────────────

import type { UserDashboardMetrics } from '@/core/types/study';

// ── Usuário logado atual (DEMO)
export const MOCK_USER = {
  id: 'demo-user-001',
  name: 'Lucas Silva',
  email: 'lucas@aprova.app',
  role: 'student' as const,
  status: 'active' as const,
  avatarInitials: 'LS',
  allowedContestIds: ['contest-prf-001', 'contest-pf-001'],
  createdAt: '2026-01-15T10:00:00Z',
};

// ── Concursos do usuário (DEMO)
export const MOCK_USER_CONTESTS = [
  {
    id: 'contest-prf-001',
    acronym: 'PRF',
    agencyName: 'Polícia Rodoviária Federal',
    agencyFull: 'Departamento de Polícia Rodoviária Federal',
    colorAccent: '#7C5CFA',
    status: 'previsto' as const,
    userProgress: 72,
    subjectsCount: 12,
    questionsAnswered: 1248,
    simulationsCompleted: 4,
    essaysWritten: 3,
    lastStudied: '2026-09-07',
  },
  {
    id: 'contest-pf-001',
    acronym: 'PF',
    agencyName: 'Polícia Federal',
    agencyFull: 'Departamento de Polícia Federal',
    colorAccent: '#22C55E',
    status: 'previsto' as const,
    userProgress: 64,
    subjectsCount: 14,
    questionsAnswered: 980,
    simulationsCompleted: 2,
    essaysWritten: 1,
    lastStudied: '2026-09-05',
  },
];

// ── Métricas do Dashboard (DEMO)
export const MOCK_DASHBOARD_METRICS: UserDashboardMetrics = {
  activeSubjectsCount: 7,
  completedLessonsCount: 48,
  totalQuestionsAnswered: 1248,
  overallAccuracyRate: 78.4,
  totalStudyHours: 94,
  currentStreakDays: 12,
  simulationsCompletedCount: 6,
  essaysWrittenCount: 4,
  weakestSubjects: [
    {
      subjectId: 's-rlm',
      subjectName: 'Raciocínio Lógico-Matemático',
      accuracyPercentage: 63,
      recommendedAction: 'Aumentar frequência de questões com cronômetro',
    },
    {
      subjectId: 's-dadm',
      subjectName: 'Direito Administrativo',
      accuracyPercentage: 68,
      recommendedAction: 'Revisar atos administrativos e processo administrativo',
    },
  ],
  strongestSubjects: [
    { subjectId: 's-leg', subjectName: 'Legislação de Trânsito', accuracyPercentage: 91 },
    { subjectId: 's-port', subjectName: 'Língua Portuguesa', accuracyPercentage: 87 },
  ],
};

// ── KPI Cards do Dashboard (DEMO)
export const MOCK_KPI_CARDS = [
  {
    id: 'kpi-progress',
    label: 'Progresso Geral',
    value: '72%',
    delta: '+3% esta semana',
    deltaPositive: true,
    colorKey: 'purple' as const,
    icon: 'Target',
  },
  {
    id: 'kpi-questions',
    label: 'Questões Resolvidas',
    value: '1.248',
    delta: '+86 hoje',
    deltaPositive: true,
    colorKey: 'orange' as const,
    icon: 'CheckSquare',
  },
  {
    id: 'kpi-accuracy',
    label: 'Taxa de Acerto',
    value: '78.4%',
    delta: '+1.2% vs semana anterior',
    deltaPositive: true,
    colorKey: 'green' as const,
    icon: 'Percent',
  },
  {
    id: 'kpi-hours',
    label: 'Horas Estudadas',
    value: '94h',
    delta: '8h esta semana',
    deltaPositive: true,
    colorKey: 'blue' as const,
    icon: 'Clock',
  },
  {
    id: 'kpi-streak',
    label: 'Sequência de Estudos',
    value: '12 dias',
    delta: 'Recorde pessoal!',
    deltaPositive: true,
    colorKey: 'rose' as const,
    icon: 'Flame',
  },
  {
    id: 'kpi-simulations',
    label: 'Simulados Realizados',
    value: '6',
    delta: 'Último: 76/120 pontos',
    deltaPositive: false,
    colorKey: 'amber' as const,
    icon: 'FileText',
  },
];

// ── Gráfico de evolução 30 dias (DEMO)
export const MOCK_EVOLUTION_CHART = [
  { day: '10/08', accuracy: 66, questions: 18 },
  { day: '12/08', accuracy: 68, questions: 24 },
  { day: '14/08', accuracy: 70, questions: 20 },
  { day: '16/08', accuracy: 69, questions: 32 },
  { day: '18/08', accuracy: 72, questions: 28 },
  { day: '20/08', accuracy: 74, questions: 36 },
  { day: '22/08', accuracy: 71, questions: 22 },
  { day: '24/08', accuracy: 75, questions: 40 },
  { day: '26/08', accuracy: 77, questions: 35 },
  { day: '28/08', accuracy: 76, questions: 28 },
  { day: '30/08', accuracy: 79, questions: 42 },
  { day: '01/09', accuracy: 78, questions: 38 },
  { day: '03/09', accuracy: 80, questions: 45 },
  { day: '05/09', accuracy: 78, questions: 30 },
  { day: '07/09', accuracy: 81, questions: 52 },
];

// ── Desempenho por disciplina (DEMO)
export const MOCK_SUBJECT_PERFORMANCE = [
  { subjectId: 's-leg',  name: 'Legislação de Trânsito', accuracy: 91, total: 210, colorKey: 'green' },
  { subjectId: 's-port', name: 'Língua Portuguesa',      accuracy: 87, total: 180, colorKey: 'blue' },
  { subjectId: 's-dpen', name: 'Direito Penal',          accuracy: 82, total: 140, colorKey: 'purple' },
  { subjectId: 's-dcon', name: 'Direito Constitucional', accuracy: 74, total: 220, colorKey: 'orange' },
  { subjectId: 's-dadm', name: 'Direito Administrativo', accuracy: 68, total: 190, colorKey: 'amber' },
  { subjectId: 's-rlm',  name: 'Raciocínio Lógico-Mat.', accuracy: 63, total: 160, colorKey: 'rose' },
  { subjectId: 's-info', name: 'Informática',            accuracy: 79, total: 100, colorKey: 'blue' },
];

// ── "Continue estudando" (DEMO)
export const MOCK_CONTINUE_STUDYING = [
  {
    id: 'cs-1',
    contestAcronym: 'PRF',
    subjectName: 'Direito Constitucional',
    topicName: 'Direitos e Garantias Fundamentais — Art. 5º',
    lastLesson: 'Aula 04 — Habeas Corpus e Mandado de Segurança',
    progress: 78,
    estimatedMinutes: 35,
  },
  {
    id: 'cs-2',
    contestAcronym: 'PRF',
    subjectName: 'Raciocínio Lógico-Matemático',
    topicName: 'Lógica Proposicional',
    lastLesson: 'Aula 02 — Tabelas-Verdade',
    progress: 40,
    estimatedMinutes: 50,
  },
  {
    id: 'cs-3',
    contestAcronym: 'PF',
    subjectName: 'Direito Penal',
    topicName: 'Crimes Contra a Administração Pública',
    lastLesson: 'Aula 01 — Corrupção Ativa e Passiva',
    progress: 20,
    estimatedMinutes: 60,
  },
];

// ── Atividades do dia (DEMO)
export const MOCK_TODAY_ACTIVITIES = [
  { time: '08:00', label: 'Língua Portuguesa', detail: 'Sintaxe e Morfologia — 30 questões', type: 'questions' },
  { time: '10:00', label: 'Legislação de Trânsito', detail: 'Resoluções CONTRAN — Teoria', type: 'theory' },
  { time: '14:00', label: 'Direito Penal', detail: 'Crimes Contra a Administração Pública', type: 'theory' },
  { time: '19:00', label: 'Treino de Redação', detail: 'Redação Discursiva — PRF', type: 'essay' },
];

// ── Notícias (DEMO)
export const MOCK_NEWS = [
  {
    id: 'news-1',
    contestAcronym: 'PRF',
    category: 'cronograma' as const,
    importance: 'high' as const,
    title: 'PRF confirma realização de concurso para 2026',
    summary: 'O Ministério da Justiça confirmou a previsão de realização do próximo concurso da Polícia Rodoviária Federal.',
    source: 'Portal Oficial PRF',
    isOfficial: true,
    publishedAt: '2026-09-07T14:30:00Z',
    timeAgo: 'Há 2 horas',
  },
  {
    id: 'news-2',
    contestAcronym: 'PF',
    category: 'cronograma' as const,
    importance: 'normal' as const,
    title: 'Polícia Federal: Atualização sobre autorização de vagas',
    summary: 'Informações sobre o andamento da autorização de vagas para o próximo concurso da Polícia Federal.',
    source: 'Portal Oficial PF',
    isOfficial: true,
    publishedAt: '2026-09-06T09:00:00Z',
    timeAgo: 'Ontem',
  },
  {
    id: 'news-3',
    contestAcronym: 'PRF',
    category: 'legislacao' as const,
    importance: 'normal' as const,
    title: 'Nova resolução do CONTRAN publicada no DOU',
    summary: 'O Diário Oficial publicou nova resolução do Conselho Nacional de Trânsito com impacto no edital.',
    source: 'Diário Oficial da União (DOU)',
    isOfficial: true,
    publishedAt: '2026-09-05T08:00:00Z',
    timeAgo: '2 dias atrás',
  },
];

// ── Disciplinas base (DEMO)
export const MOCK_DISCIPLINES = [
  { id: 's-leg',  name: 'Legislação de Trânsito', shortName: 'Trânsito',  icon: 'Car',         accuracy: 91, questions: 210, lastStudied: 'Hoje',         progress: 88, contestAcronym: 'PRF' },
  { id: 's-port', name: 'Língua Portuguesa',      shortName: 'Português', icon: 'BookOpen',    accuracy: 87, questions: 180, lastStudied: 'Ontem',        progress: 72, contestAcronym: 'PRF' },
  { id: 's-dpen', name: 'Direito Penal',          shortName: 'Dir. Penal',icon: 'Shield',      accuracy: 82, questions: 140, lastStudied: '2 dias atrás', progress: 55, contestAcronym: 'PRF' },
  { id: 's-dcon', name: 'Direito Constitucional', shortName: 'Dir. Const.',icon:'Scale',        accuracy: 74, questions: 220, lastStudied: '3 dias atrás', progress: 80, contestAcronym: 'PRF' },
  { id: 's-info', name: 'Informática',            shortName: 'Informática',icon:'Monitor',     accuracy: 79, questions: 100, lastStudied: '4 dias atrás', progress: 60, contestAcronym: 'PRF' },
  { id: 's-dadm', name: 'Direito Administrativo', shortName: 'Dir. Adm.', icon: 'Building2',   accuracy: 68, questions: 190, lastStudied: '5 dias atrás', progress: 45, contestAcronym: 'PRF' },
  { id: 's-rlm',  name: 'Raciocínio Lógico',     shortName: 'Raciocínio',icon: 'BrainCircuit', accuracy: 63, questions: 160, lastStudied: '6 dias atrás', progress: 38, contestAcronym: 'PRF' },
];

// ── Calendário: dias estudados neste mês (DEMO)
export const MOCK_STUDIED_DAYS = [1, 2, 3, 5, 6, 8, 9, 10, 12, 13, 14, 15, 17, 19, 21, 22, 24, 26, 28, 29, 30];
