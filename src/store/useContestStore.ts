import { create } from 'zustand';

interface ContestStore {
  selectedContestId: string | null;
  selectedContestAcronym: string | null;
  setSelectedContestId: (id: string | null) => void;
  setSelectedContest: (contest: { id: string; acronym: string; agencyName?: string } | null) => void;
}

export const useContestStore = create<ContestStore>((set) => ({
  selectedContestId: typeof window !== 'undefined' ? localStorage.getItem('aprova-active-contest') : null,
  selectedContestAcronym: typeof window !== 'undefined' ? localStorage.getItem('aprova-active-contest-acronym') : null,
  setSelectedContestId: (id) => {
    if (id) {
      localStorage.setItem('aprova-active-contest', id);
    } else {
      localStorage.removeItem('aprova-active-contest');
    }
    set({ selectedContestId: id });
  },
  setSelectedContest: (contest) => {
    if (contest) {
      localStorage.setItem('aprova-active-contest', contest.id);
      localStorage.setItem('aprova-active-contest-acronym', contest.acronym);
      set({ selectedContestId: contest.id, selectedContestAcronym: contest.acronym });
    } else {
      localStorage.removeItem('aprova-active-contest');
      localStorage.removeItem('aprova-active-contest-acronym');
      set({ selectedContestId: null, selectedContestAcronym: null });
    }
  },
}));
