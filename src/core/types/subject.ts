export interface Topic {
  id: string;
  subjectId: string;
  parentId?: string | null; // Suporte a árvore hierárquica de subassuntos
  name: string; // ex: "Direitos e Garantias Fundamentais"
  orderIndex: number;
}

export interface Subject {
  id: string;
  name: string; // ex: "Direito Constitucional", "Legislação de Trânsito", "Informática"
  shortName?: string;
  iconName?: string;
  colorToken?: string; // ex: "pastel-cyan", "pastel-purple"
  topics?: Topic[];
}

export interface ContestSubject {
  id: string;
  contestId: string;
  subjectId: string;
  weight: number; // Peso na prova (ex: 1.0, 1.5, 2.0)
  expectedQuestionsCount: number; // Quantidade prevista (ex: 30 questões de Legislação de Trânsito)
  subject?: Subject;
}
