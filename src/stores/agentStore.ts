import { create } from 'zustand';
import type { AgentStep } from '../agents/types';

interface AgentState {
  steps: AgentStep[];
  isRunning: boolean;
  consoleOpen: boolean;
  totalTokens: number;
  totalLatencyMs: number;

  addStep: (step: AgentStep) => void;
  updateStep: (agent: string, stepNum: number, update: Partial<AgentStep>) => void;
  setRunning: (running: boolean) => void;
  toggleConsole: () => void;
  setConsoleOpen: (open: boolean) => void;
  addTokens: (count: number) => void;
  addLatency: (ms: number) => void;
  reset: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  steps: [],
  isRunning: false,
  consoleOpen: false,
  totalTokens: 0,
  totalLatencyMs: 0,

  addStep: (step) =>
    set((state) => ({ steps: [...state.steps, step] })),
  updateStep: (agent, stepNum, update) =>
    set((state) => ({
      steps: state.steps.map((s) =>
        s.agent === agent && s.step === stepNum ? { ...s, ...update } : s,
      ),
    })),
  setRunning: (running) => set({ isRunning: running }),
  toggleConsole: () => set((state) => ({ consoleOpen: !state.consoleOpen })),
  setConsoleOpen: (open) => set({ consoleOpen: open }),
  addTokens: (count) =>
    set((state) => ({ totalTokens: state.totalTokens + count })),
  addLatency: (ms) =>
    set((state) => ({ totalLatencyMs: state.totalLatencyMs + ms })),
  reset: () =>
    set({
      steps: [],
      isRunning: false,
      totalTokens: 0,
      totalLatencyMs: 0,
    }),
}));
