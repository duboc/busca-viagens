import { create } from 'zustand';
import type { Trip, TripItem } from '../agents/types';
import * as TripRepo from '../db/repositories/TripRepository';

interface TripState {
  trips: Trip[];
  currentTrip: Trip | null;
  items: TripItem[];
  loading: boolean;

  loadTrips: () => Promise<void>;
  loadTrip: (id: string) => Promise<void>;
  createTrip: (
    name: string,
    description?: string,
    coverEmoji?: string,
    startDate?: string,
    endDate?: string,
    totalBudget?: number,
    currency?: string,
  ) => Promise<string>;
  updateTrip: (id: string, fields: Partial<Omit<Trip, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  addItem: (tripId: string, item: Omit<TripItem, 'id' | 'tripId' | 'createdAt'>) => Promise<string>;
  updateItem: (id: string, fields: Partial<Omit<TripItem, 'id' | 'tripId' | 'createdAt'>>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  reorderItems: (tripId: string, itemIds: string[]) => Promise<void>;
  addFlightToTrip: (tripId: string, flightId: string) => Promise<string>;
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  currentTrip: null,
  items: [],
  loading: false,

  loadTrips: async () => {
    set({ loading: true });
    try {
      const trips = await TripRepo.getTrips();
      set({ trips });
    } finally {
      set({ loading: false });
    }
  },

  loadTrip: async (id: string) => {
    set({ loading: true });
    try {
      const [trip, items] = await Promise.all([
        TripRepo.getTrip(id),
        TripRepo.getTripItems(id),
      ]);
      set({ currentTrip: trip, items });
    } finally {
      set({ loading: false });
    }
  },

  createTrip: async (name, description, coverEmoji, startDate, endDate, totalBudget, currency) => {
    const id = await TripRepo.createTrip(name, description, coverEmoji, startDate, endDate, totalBudget, currency);
    await get().loadTrips();
    return id;
  },

  updateTrip: async (id, fields) => {
    await TripRepo.updateTrip(id, fields);
    // Refresh current trip if it's the one being updated
    const current = get().currentTrip;
    if (current && current.id === id) {
      const updated = await TripRepo.getTrip(id);
      set({ currentTrip: updated });
    }
    await get().loadTrips();
  },

  deleteTrip: async (id) => {
    await TripRepo.deleteTrip(id);
    const current = get().currentTrip;
    if (current && current.id === id) {
      set({ currentTrip: null, items: [] });
    }
    await get().loadTrips();
  },

  addItem: async (tripId, item) => {
    const id = await TripRepo.addTripItem(tripId, item);
    // Reload items if currently viewing this trip
    const current = get().currentTrip;
    if (current && current.id === tripId) {
      const items = await TripRepo.getTripItems(tripId);
      set({ items });
    }
    return id;
  },

  updateItem: async (id, fields) => {
    await TripRepo.updateTripItem(id, fields);
    const current = get().currentTrip;
    if (current) {
      const items = await TripRepo.getTripItems(current.id);
      set({ items });
    }
  },

  removeItem: async (id) => {
    await TripRepo.deleteTripItem(id);
    const current = get().currentTrip;
    if (current) {
      const items = await TripRepo.getTripItems(current.id);
      set({ items });
    }
  },

  reorderItems: async (tripId, itemIds) => {
    await TripRepo.reorderTripItems(tripId, itemIds);
    const current = get().currentTrip;
    if (current && current.id === tripId) {
      const items = await TripRepo.getTripItems(tripId);
      set({ items });
    }
  },

  addFlightToTrip: async (tripId, flightId) => {
    const itemId = await TripRepo.addFlightToTrip(tripId, flightId);
    const current = get().currentTrip;
    if (current && current.id === tripId) {
      const items = await TripRepo.getTripItems(tripId);
      set({ items });
    }
    await get().loadTrips();
    return itemId;
  },
}));
