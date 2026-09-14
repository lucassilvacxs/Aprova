export const APP_CONFIG = {
  name: 'APROVA',
  tagline: 'Plataforma Privada de Alto Rendimento para Concursos Públicos',
  version: '1.0.0',
};

export const INITIAL_AGENCIES = [
  {
    acronym: 'PRF',
    name: 'Polícia Rodoviária Federal',
    sphere: 'federal',
    websiteUrl: 'https://www.gov.br/prf',
  },
  {
    acronym: 'PF',
    name: 'Polícia Federal',
    sphere: 'federal',
    websiteUrl: 'https://www.gov.br/pf',
  },
] as const;

export const EXAM_BOARDS = [
  {
    acronym: 'Cebraspe',
    name: 'Centro Brasileiro de Pesquisa em Avaliação e Seleção e de Promoção de Eventos',
    scoringStyle: 'cebraspe_negative_points',
  },
  {
    acronym: 'FGV',
    name: 'Fundação Getulio Vargas',
    scoringStyle: 'standard_multiple_choice',
  },
] as const;

export const CONTEST_STATUS_LABELS: Record<string, { label: string; badgeVariant: 'warning' | 'info' | 'success' | 'purple' }> = {
  previsto: { label: 'Previsto', badgeVariant: 'warning' },
  autorizado: { label: 'Autorizado', badgeVariant: 'purple' },
  edital_publicado: { label: 'Edital Publicado', badgeVariant: 'info' },
  inscricoes_abertas: { label: 'Inscrições Abertas', badgeVariant: 'success' },
  em_andamento: { label: 'Em Andamento', badgeVariant: 'info' },
  concluido: { label: 'Concluído', badgeVariant: 'purple' },
};

export const ESSAY_CRITERIA_MAX_SCORES = {
  themeAdherence: 20,
  structure: 20,
  argumentation: 20,
  cohesion: 20,
  grammar: 20,
  total: 100,
};

export const OFFICIAL_NEWS_SOURCES = [
  'Diário Oficial da União (DOU)',
  'Portal Oficial da PRF',
  'Portal Oficial da PF',
  'Página Oficial do Cebraspe',
] as const;
