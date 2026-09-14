export type NewsCategory =
  | 'edital'
  | 'cronograma'
  | 'legislacao'
  | 'banca'
  | 'vagas_remuneracao'
  | 'etapas_provas'
  | 'geral';

export type NewsImportance = 'normal' | 'high' | 'urgent';

export interface NewsSource {
  id: string;
  name: string; // ex: "Diário Oficial da União (DOU)", "Portal Oficial PRF (gov.br/prf)"
  url: string;
  isOfficial: boolean; // Flag estrita: somente órgãos/bancas oficiais = true
}

export interface NewsArticle {
  id: string;
  sourceId: string;
  source?: NewsSource;
  contestId?: string | null; // Concurso específico ou null se for concurso geral
  title: string;
  summary: string;
  contentMarkdown: string;
  publishedAt: string;
  originalUrl: string;
  category: NewsCategory;
  importance: NewsImportance;
  coverImageUrl?: string | null;
  createdAt: string;
}

export type DocumentCategory =
  | 'edital_abertura'
  | 'retificacao'
  | 'comunicado'
  | 'prova_anterior'
  | 'gabarito_preliminar'
  | 'gabarito_definitivo'
  | 'convocacao_taf'
  | 'resultado_final';

export interface ContestDocument {
  id: string;
  contestId: string;
  title: string; // ex: "Edital de Abertura nº 01/2021 - PRF"
  category: DocumentCategory;
  fileUrl: string;
  fileSizeBytes: number;
  publicationDate: string;
  hashSha256?: string;
  createdAt: string;
}
