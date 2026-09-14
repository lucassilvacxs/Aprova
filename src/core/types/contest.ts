export type SphereType = 'federal' | 'state' | 'municipal';

export interface Agency {
  id: string;
  name: string; // ex: "Polícia Rodoviária Federal"
  acronym: string; // ex: "PRF"
  sphere: SphereType;
  logoUrl?: string;
  websiteUrl?: string;
}

export type ScoringStyle = 'cebraspe_negative_points' | 'standard_multiple_choice';

export interface ExamBoard {
  id: string;
  name: string; // ex: "Cebraspe"
  acronym: string; // ex: "CESPE"
  scoringStyle: ScoringStyle;
  websiteUrl?: string;
}

export type ContestStatus =
  | 'previsto'
  | 'comissao_formada'
  | 'autorizado'
  | 'banca_definida'
  | 'edital_publicado'
  | 'inscricoes_abertas'
  | 'em_andamento'
  | 'concluido';

export interface Position {
  id: string;
  contestId: string;
  title: string; // ex: "Policial Rodoviário Federal"
  vacanciesCount: number;
  salaryBase: number; // ex: 10700.00
  requirements: string[]; // ex: ["Ensino Superior Completo", "CNH Categoria B ou superior"]
  duties?: string;
}

export interface ContestStage {
  id: string;
  contestId: string;
  orderIndex: number;
  title: string; // ex: "Prova Objetiva", "Prova Discursiva", "Exame de Aptidão Física (TAF)"
  date?: string;
  eliminatory: boolean;
  classificatory: boolean;
}

export interface Contest {
  id: string;
  agencyId: string;
  boardId: string;
  title: string; // ex: "Concurso Público PRF 2026"
  year: number;
  status: ContestStatus;
  description?: string;
  officialPageUrl?: string;
  active: boolean;
  agency?: Agency;
  board?: ExamBoard;
  positions?: Position[];
  stages?: ContestStage[];
  createdAt: string;
  updatedAt: string;
}
