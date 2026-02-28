import { runPlannerAgent } from './PlannerAgent';
import { runSearcherAgent } from './SearcherAgent';
import { runParserAgent } from './ParserAgent';
import { runRankerAgent } from './RankerAgent';
import type { AgentStep, Flight, SearchPlan } from './types';
import { createSearch, updateSearchStatus, updateSearchParsed } from '../db/repositories/SearchRepository';
import { insertFlights } from '../db/repositories/FlightRepository';
import { insertAgentLog, agentStepToLog } from '../db/repositories/AgentLogRepository';
import { getDatabase, saveDatabase } from '../db/database';
import { v4 as uuid } from 'uuid';

export interface AgentEngineCallbacks {
  onStep: (step: AgentStep) => void;
  onPlanReady: (plan: SearchPlan) => void;
  onFlightsReady: (flights: Flight[]) => void;
  onComplete: (flights: Flight[]) => void;
  onError: (error: Error) => void;
}

export async function executeSearch(
  apiKey: string,
  rawQuery: string,
  callbacks: AgentEngineCallbacks,
): Promise<void> {
  const search = await createSearch(rawQuery);
  const searchId = search.id;

  try {
    // Phase 1: Planning
    await updateSearchStatus(searchId, 'planning');

    const { plan, tokensUsed: planTokens, latencyMs: planLatency } =
      await runPlannerAgent(apiKey, rawQuery, (step) => {
        callbacks.onStep(step);
        insertAgentLog(agentStepToLog(searchId, step, {
          tokensUsed: step.status === 'completed' ? planTokens : undefined,
          latencyMs: step.status === 'completed' ? planLatency : undefined,
        })).catch(console.error);
      });

    callbacks.onPlanReady(plan);

    // Update search with parsed intent
    await updateSearchParsed(searchId, {
      parsedOrigin: plan.intent.origins.map((o) => o.iata).join(','),
      parsedDest: plan.intent.destinations.map((d) => d.iata).join(','),
      dateFrom: plan.intent.dateRanges[0]?.from,
      dateTo: plan.intent.dateRanges[plan.intent.dateRanges.length - 1]?.to,
      flexibilityDays: plan.intent.flexibility,
      passengers: plan.intent.passengers,
      cabinClass: plan.intent.cabin,
      maxBudget: plan.intent.budget?.amount,
      tripType: plan.intent.tripType,
    });

    // Save plan
    const db = await getDatabase();
    db.run(
      'INSERT INTO search_plans (id, search_id, plan_json, strategy_count, reasoning) VALUES (?,?,?,?,?)',
      [uuid(), searchId, JSON.stringify(plan), plan.strategies.length, plan.reasoning],
    );
    saveDatabase();

    // Phase 2: Searching
    await updateSearchStatus(searchId, 'searching');

    const { results, tokensUsed: searchTokens, latencyMs: searchLatency } =
      await runSearcherAgent(apiKey, plan.strategies, (step) => {
        callbacks.onStep(step);
        insertAgentLog(agentStepToLog(searchId, step, {
          tokensUsed: step.status === 'completed' ? searchTokens : undefined,
          latencyMs: step.status === 'completed' ? searchLatency : undefined,
        })).catch(console.error);
      });

    // Phase 3: Parsing
    await updateSearchStatus(searchId, 'parsing');

    const { flights: parsedFlights, latencyMs: parseLatency } =
      runParserAgent(searchId, results, (step) => {
        callbacks.onStep(step);
        insertAgentLog(agentStepToLog(searchId, step, {
          latencyMs: step.status === 'completed' ? parseLatency : undefined,
        })).catch(console.error);
      });

    callbacks.onFlightsReady(parsedFlights);

    // Phase 4: Ranking
    await updateSearchStatus(searchId, 'ranking');

    const { rankedFlights, tokensUsed: rankTokens, latencyMs: rankLatency } =
      await runRankerAgent(apiKey, parsedFlights, (step) => {
        callbacks.onStep(step);
        insertAgentLog(agentStepToLog(searchId, step, {
          tokensUsed: step.status === 'completed' ? rankTokens : undefined,
          latencyMs: step.status === 'completed' ? rankLatency : undefined,
        })).catch(console.error);
      });

    // Persist flights
    await insertFlights(rankedFlights);

    // Complete
    await updateSearchStatus(searchId, 'completed');
    callbacks.onComplete(rankedFlights);
  } catch (err) {
    await updateSearchStatus(searchId, 'failed');
    callbacks.onError(err as Error);
  }
}
