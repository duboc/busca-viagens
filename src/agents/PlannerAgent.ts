import { callGemini, parseJsonResponse } from '../services/gemini';
import type { SearchPlan, AgentStep } from './types';

const PLANNER_SYSTEM = `Você é um agente especialista em viagens aéreas. Analise a intenção do usuário e crie um plano de busca otimizado.

REGRAS:
1. Identifique cidades, datas, orçamento e preferências
2. Considere aeroportos alternativos próximos
3. Para datas flexíveis, crie janelas de ±flex dias
4. Priorize voos diretos, depois 1 parada, depois 2+ paradas
5. Considere diferentes companhias e alianças
6. Se o orçamento for apertado, sugira datas alternativas mais baratas
7. Para destinos com múltiplos aeroportos, busque todos
8. Datas devem estar no formato ISO 8601 (YYYY-MM-DD)
9. Use códigos IATA de 3 letras para aeroportos

RESPONDA ESTRITAMENTE em JSON no formato especificado.`;

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    intent: {
      type: 'object',
      properties: {
        origins: {
          type: 'array',
          items: {
            type: 'object',
            properties: { iata: { type: 'string' }, name: { type: 'string' } },
            required: ['iata'],
          },
        },
        destinations: {
          type: 'array',
          items: {
            type: 'object',
            properties: { iata: { type: 'string' }, name: { type: 'string' } },
            required: ['iata'],
          },
        },
        dateRanges: {
          type: 'array',
          items: {
            type: 'object',
            properties: { from: { type: 'string' }, to: { type: 'string' } },
            required: ['from', 'to'],
          },
        },
        tripType: { type: 'string' },
        passengers: { type: 'integer' },
        cabin: { type: 'string' },
        budget: {
          type: 'object',
          properties: { amount: { type: 'number' }, currency: { type: 'string' } },
        },
        flexibility: { type: 'integer' },
      },
      required: ['origins', 'destinations', 'dateRanges', 'tripType', 'passengers', 'cabin', 'flexibility'],
    },
    strategies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          origin: { type: 'string' },
          destination: { type: 'string' },
          dateRange: {
            type: 'object',
            properties: { from: { type: 'string' }, to: { type: 'string' } },
          },
          priority: { type: 'integer' },
          searchQueries: { type: 'array', items: { type: 'string' } },
          expectedSource: { type: 'string' },
        },
        required: ['id', 'type', 'origin', 'destination', 'dateRange', 'priority', 'searchQueries', 'expectedSource'],
      },
    },
    reasoning: { type: 'string' },
  },
  required: ['intent', 'strategies', 'reasoning'],
};

export async function runPlannerAgent(
  apiKey: string,
  rawQuery: string,
  onStep: (step: AgentStep) => void,
): Promise<{ plan: SearchPlan; tokensUsed: number; latencyMs: number }> {
  const start = Date.now();

  onStep({
    agent: 'planner',
    step: 1,
    action: 'Analisando intenção de viagem',
    status: 'running',
    timestamp: Date.now(),
  });

  const prompt = `Analise esta intenção de viagem e crie um plano de busca:\n\n"${rawQuery}"\n\nData de hoje: ${new Date().toISOString().split('T')[0]}`;

  try {
    const response = await callGemini(apiKey, {
      prompt,
      systemInstruction: PLANNER_SYSTEM,
      responseSchema: PLAN_SCHEMA,
      temperature: 0.1,
    });

    const plan = parseJsonResponse<SearchPlan>(response.text);
    const latencyMs = Date.now() - start;

    onStep({
      agent: 'planner',
      step: 1,
      action: `Plano gerado: ${plan.strategies.length} estratégias`,
      status: 'completed',
      detail: plan.reasoning,
      timestamp: Date.now(),
    });

    return { plan, tokensUsed: response.tokensUsed, latencyMs };
  } catch (err) {
    onStep({
      agent: 'planner',
      step: 1,
      action: 'Erro ao gerar plano',
      status: 'error',
      detail: (err as Error).message,
      timestamp: Date.now(),
    });
    throw err;
  }
}
