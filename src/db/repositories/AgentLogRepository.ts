import { v4 as uuid } from 'uuid';
import { getDatabase, saveDatabase } from '../database';
import type { AgentStep } from '../../agents/types';

export interface AgentLog {
  id: string;
  searchId: string;
  agentName: string;
  step: number;
  action: string;
  inputData?: string;
  outputData?: string;
  tokensUsed?: number;
  latencyMs?: number;
  status: string;
  errorMsg?: string;
  createdAt: string;
}

export async function insertAgentLog(log: Omit<AgentLog, 'id' | 'createdAt'>): Promise<string> {
  const db = await getDatabase();
  const id = uuid();
  db.run(
    `INSERT INTO agent_logs (id, search_id, agent_name, step, action, input_data, output_data, tokens_used, latency_ms, status, error_msg)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      log.searchId,
      log.agentName,
      log.step,
      log.action,
      log.inputData ?? null,
      log.outputData ?? null,
      log.tokensUsed ?? null,
      log.latencyMs ?? null,
      log.status,
      log.errorMsg ?? null,
    ],
  );
  saveDatabase();
  return id;
}

export async function getAgentLogsBySearch(searchId: string): Promise<AgentLog[]> {
  const db = await getDatabase();
  const results = db.exec(
    'SELECT * FROM agent_logs WHERE search_id = ? ORDER BY created_at ASC, step ASC',
    [searchId],
  );
  if (!results.length) return [];
  const cols = results[0].columns;
  return results[0].values.map((vals) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => (obj[c] = vals[i]));
    return {
      id: obj['id'] as string,
      searchId: obj['search_id'] as string,
      agentName: obj['agent_name'] as string,
      step: obj['step'] as number,
      action: obj['action'] as string,
      inputData: obj['input_data'] as string | undefined,
      outputData: obj['output_data'] as string | undefined,
      tokensUsed: obj['tokens_used'] as number | undefined,
      latencyMs: obj['latency_ms'] as number | undefined,
      status: obj['status'] as string,
      errorMsg: obj['error_msg'] as string | undefined,
      createdAt: obj['created_at'] as string,
    };
  });
}

export function agentStepToLog(
  searchId: string,
  step: AgentStep,
  extra?: { inputData?: string; outputData?: string; tokensUsed?: number; latencyMs?: number },
): Omit<AgentLog, 'id' | 'createdAt'> {
  return {
    searchId,
    agentName: step.agent,
    step: step.step,
    action: step.action,
    status: step.status === 'error' ? 'error' : 'success',
    errorMsg: step.status === 'error' ? step.detail : undefined,
    ...extra,
  };
}
