import { create } from 'zustand';
import type { Search, Flight, MultiCityLeg, AllianceType } from '../agents/types';

export type TripMode = 'roundtrip' | 'oneway' | 'multi_city';

interface SearchState {
  currentSearch: Search | null;
  flights: Flight[];
  sortBy: 'rank' | 'price' | 'duration' | 'stops';
  filterStops: number | null;
  recentSearches: Search[];
  compareIds: Set<string>;

  // Smart features state
  tripMode: TripMode;
  multiCityLegs: MultiCityLeg[];
  filterAlliance: AllianceType | null;
  exploreOrigin: string;

  setCurrentSearch: (search: Search | null) => void;
  updateSearchStatus: (status: Search['status']) => void;
  setFlights: (flights: Flight[]) => void;
  setSortBy: (sortBy: SearchState['sortBy']) => void;
  setFilterStops: (stops: number | null) => void;
  setRecentSearches: (searches: Search[]) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  reset: () => void;

  // Smart features actions
  setTripMode: (mode: TripMode) => void;
  setMultiCityLegs: (legs: MultiCityLeg[]) => void;
  setFilterAlliance: (alliance: AllianceType | null) => void;
  setExploreOrigin: (origin: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  currentSearch: null,
  flights: [],
  sortBy: 'rank',
  filterStops: null,
  recentSearches: [],
  compareIds: new Set<string>(),

  // Smart features initial state
  tripMode: 'roundtrip',
  multiCityLegs: [
    { origin: '', destination: '', dateRange: { from: '', to: '' } },
    { origin: '', destination: '', dateRange: { from: '', to: '' } },
  ],
  filterAlliance: null,
  exploreOrigin: '',

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

  // Smart features actions
  setTripMode: (mode) => set({ tripMode: mode }),
  setMultiCityLegs: (legs) => set({ multiCityLegs: legs }),
  setFilterAlliance: (alliance) => set({ filterAlliance: alliance }),
  setExploreOrigin: (origin) => set({ exploreOrigin: origin }),
}));
