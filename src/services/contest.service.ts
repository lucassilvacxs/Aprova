import { api } from './api';

export interface ContestItem {
  id: string;
  acronym: string;
  agencyName: string;
  agencyFull: string;
  slug: string;
  year: number;
  status: string;
  vacanciesCount: number;
  salaryBase: string;
  boardName?: string;
  colorAccent: string;
  userProgress: number;
  questionsAnswered: number;
  simulationsCompleted: number;
  essaysWritten: number;
  lastStudied: string | null;
}

export interface ContestDetail extends ContestItem {
  officialPageUrl?: string;
  description?: string;
  positions: Array<{
    id: string;
    title: string;
    vacanciesCount: number;
    salaryBase: string;
  }>;
  subjects: Array<{
    id: string;
    name: string;
    shortName: string;
    slug: string;
    colorToken: string;
    weight: number;
    questionsCount: number;
    progress: number;
    accuracy: number;
    questionsAnswered: number;
  }>;
}

export interface SubjectItem {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  description?: string;
  colorToken: string;
  accuracy: number;
  progress: number;
  questions: number;
  lastStudied: string;
}

export const contestService = {
  async getContests(): Promise<ContestItem[]> {
    return api.get<ContestItem[]>('/contests');
  },

  async getContestById(id: string): Promise<ContestDetail> {
    return api.get<ContestDetail>(`/contests/${id}`);
  },

  async getSubjects(): Promise<SubjectItem[]> {
    return api.get<SubjectItem[]>('/contests/subjects/list');
  },
};
