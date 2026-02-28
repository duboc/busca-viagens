import { create } from 'zustand';
import type { Search, Flight } from '../agents/types';

interface SearchState {
  currentSearch: Search | null;
  flights: Flight[];
  sortBy: 'rank' | 'price' | 'duration' | 'stops';
  filterStops: number | null;
  recentSearches: Search[];
  compareIds: Set<string>;

  setCurrentSearch: (search: Search | null) => void;
  updateSearchStatus: (status: Search['status']) => void;
  setFlights: (flights: Flight[]) => void;
  setSortBy: (sortBy: SearchState['sortBy']) => void;
  setFilterStops: (stops: number | null) => void;
  setRecentSearches: (searches: Search[]) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  currentSearch: null,
  flights: [],
  sortBy: 'rank',
  filterStops: null,
  recentSearches: [],
  compareIds: new Set<string>(),

  setCurrentSearch: (search) => set({ currentSearch: search }),
  updateSearchStatus: (status) =>
    set((state) => ({
      currentSearch: state.currentSearch
        ? { ...state.currentSearch, status }
        : null,
    })),
  setFlights: (flights) => set({ flights }),
  setSortBy: (sortBy) => set({ sortBy }),
  setFilterStops: (stops) => set({ filterStops: stops }),
  setRecentSearches: (searches) => set({ recentSearches: searches }),
  toggleCompare: (id) =>
    set((state) => {
      const next = new Set(state.compareIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { compareIds: next };
    }),
  clearCompare: () => set({ compareIds: new Set<string>() }),
  reset: () =>
    set({
      currentSearch: null,
      flights: [],
      sortBy: 'rank',
      filterStops: null,
      compareIds: new Set<string>(),
    }),
}));
