import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchStore } from '../stores/searchStore';
import { useAgentStore } from '../stores/agentStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useUIStore } from '../stores/uiStore';
import { executeSearch } from '../agents/AgentEngine';
import type { SearchPlan } from '../agents/types';

export function useSearch() {
  const navigate = useNavigate();
  const { setCurrentSearch, setFlights, reset: resetSearch } = useSearchStore();
  const { addStep, setRunning, addTokens, addLatency, reset: resetAgent } = useAgentStore();
  const { geminiApiKey } = useSettingsStore();
  const { setError } = useUIStore();
  const [plan, setPlan] = useState<SearchPlan | null>(null);
  const abortRef = useRef(false);

  const search = useCallback(
    async (query: string) => {
      if (!geminiApiKey) {
        setError('Configure sua API key do Gemini nas Configurações antes de buscar.');
        navigate('/settings');
        return;
      }

      abortRef.current = false;
      resetSearch();
      resetAgent();
      setRunning(true);
      setPlan(null);

      // Create a temporary search object for immediate UI feedback
      setCurrentSearch({
        id: 'pending',
        rawInput: query,
        flexibilityDays: 0,
        passengers: 1,
        cabinClass: 'economy',
        currency: 'BRL',
        tripType: 'roundtrip',
        status: 'planning',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      navigate('/results');

      try {
        await executeSearch(geminiApiKey, query, {
          onStep: (step) => {
            if (abortRef.current) return;
            addStep(step);
            if (step.status === 'completed') {
              // Estimate tokens/latency from step timing
            }
          },
          onPlanReady: (searchPlan) => {
            if (abortRef.current) return;
            setPlan(searchPlan);

            setCurrentSearch({
              id: 'active',
              rawInput: query,
              parsedOrigin: searchPlan.intent.origins.map((o) => o.iata).join(','),
              parsedDest: searchPlan.intent.destinations.map((d) => d.iata).join(','),
              dateFrom: searchPlan.intent.dateRanges[0]?.from,
              dateTo: searchPlan.intent.dateRanges[searchPlan.intent.dateRanges.length - 1]?.to,
              flexibilityDays: searchPlan.intent.flexibility,
              passengers: searchPlan.intent.passengers,
              cabinClass: searchPlan.intent.cabin,
              maxBudget: searchPlan.intent.budget?.amount,
              currency: searchPlan.intent.budget?.currency ?? 'BRL',
              tripType: searchPlan.intent.tripType,
              status: 'searching',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          },
          onFlightsReady: (flights) => {
            if (abortRef.current) return;
            setFlights(flights);
          },
          onComplete: (flights) => {
            if (abortRef.current) return;
            setFlights(flights);
            setRunning(false);
            addTokens(0); // Will be aggregated from agent logs
            addLatency(0);
          },
          onError: (error) => {
            if (abortRef.current) return;
            setRunning(false);
            setError(error.message);
          },
        });
      } catch (err) {
        if (!abortRef.current) {
          setRunning(false);
          setError((err as Error).message);
        }
      }
    },
    [geminiApiKey, navigate, setCurrentSearch, setFlights, resetSearch, resetAgent, setRunning, addStep, addTokens, addLatency, setError],
  );

  const abort = useCallback(() => {
    abortRef.current = true;
    setRunning(false);
  }, [setRunning]);

  return { search, abort, plan };
}
