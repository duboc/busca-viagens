import { create } from 'zustand';

interface UIState {
  dbReady: boolean;
  loading: boolean;
  error: string | null;
  selectedFlightId: string | null;
  detailModalOpen: boolean;

  setDbReady: (ready: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  selectFlight: (id: string | null) => void;
  openDetailModal: (id: string) => void;
  closeDetailModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  dbReady: false,
  loading: false,
  error: null,
  selectedFlightId: null,
  detailModalOpen: false,

  setDbReady: (ready) => set({ dbReady: ready }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  selectFlight: (id) => set({ selectedFlightId: id }),
  openDetailModal: (id) =>
    set({ selectedFlightId: id, detailModalOpen: true }),
  closeDetailModal: () =>
    set({ detailModalOpen: false }),
}));
