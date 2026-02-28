import { create } from 'zustand';
import type { Search, Flight } from '../agents/types';

interface SearchState {
  currentSearch: Search | null;
  flights: Flight[];
  sortBy: 'rank' | 'price' | 'duration' | 'stops';
  filterStops: number | null;
  recentSearches: Search[];

  setCurrentSearch: (search: Search | null) => void;
  updateSearchStatus: (status: Search['status']) => void;
  setFlights: (flights: Flight[]) => void;
  setSortBy: (sortBy: SearchState['sortBy']) => void;
  setFilterStops: (stops: number | null) => void;
  setRecentSearches: (searches: Search[]) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  currentSearch: null,
  flights: [],
  sortBy: 'rank',
  filterStops: null,
  recentSearches: [],

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
  reset: () =>
    set({
      currentSearch: null,
      flights: [],
      sortBy: 'rank',
      filterStops: null,
    }),
}));
