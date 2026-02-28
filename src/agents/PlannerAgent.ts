import { callGemini, parseJsonResponse } from '../services/gemini';
import { getDatabase } from '../db/database';
import type { SearchPlan, SearchStrategy, AgentStep, AirportRef, DateRange } from './types';

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
10. Para datas relativas como "mês que vem", "em 3 semanas", "páscoa", "natal", "carnaval", "ano novo", calcule a data exata baseada na data de hoje fornecida
11. Para viagens multi-city como "SP → Tokyo → Seoul → SP", crie legs separados para cada trecho
12. Se o usuário mencionar uma cidade, identifique TODOS os aeroportos daquela cidade

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

// --- Airport code validation ---

let airportCodeCache: Set<string> | null = null;

async function loadAirportCodes(): Promise<Set<string>> {
  if (airportCodeCache) return airportCodeCache;
  try {
    const db = await getDatabase();
    const result = db.exec('SELECT iata_code FROM airports');
    const codes = new Set<string>();
    if (result[0]) {
      for (const row of result[0].values) {
        codes.add(String(row[0]).toUpperCase());
      }
    }
    airportCodeCache = codes;
    return codes;
  } catch {
    return new Set<string>();
  }
}

async function validateAirportCode(iata: string): Promise<boolean> {
  const codes = await loadAirportCodes();
  if (codes.size === 0) return true; // If DB is empty, skip validation
  return codes.has(iata.toUpperCase());
}

async function findAirportsByCity(city: string): Promise<string[]> {
  try {
    const db = await getDatabase();
    const result = db.exec(
      `SELECT iata_code FROM airports WHERE LOWER(city) = LOWER('${city.replace(/'/g, "''")}')`,
    );
    if (result[0]) {
      return result[0].values.map((row: unknown[]) => String(row[0]).toUpperCase());
    }
  } catch {
    // Ignore DB errors
  }
  return [];
}

// --- Relative date resolution ---

/**
 * Resolve relative date expressions in the user query.
 * Adds concrete date hints to help Gemini produce correct dates.
 */
function resolveRelativeDates(query: string, today: Date): string {
  const hints: string[] = [];
  const lowerQuery = query.toLowerCase();

  // "next month" / "mês que vem" / "proximo mes"
  if (/mês que vem|pr[oó]ximo m[eê]s|next month/i.test(lowerQuery)) {
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    hints.push(
      `"mês que vem" = ${formatDate(nextMonth)} a ${formatDate(lastDay)}`,
    );
  }

  // "in X weeks" / "em X semanas" / "daqui X semanas"
  const weeksMatch = lowerQuery.match(/(?:em|in|daqui(?:\s+a)?)\s+(\d+)\s+semanas?|(\d+)\s+weeks?/i);
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1] ?? weeksMatch[2], 10);
    const target = new Date(today);
    target.setDate(target.getDate() + weeks * 7);
    hints.push(`"em ${weeks} semanas" = ${formatDate(target)}`);
  }

  // "in X days" / "em X dias" / "daqui X dias"
  const daysMatch = lowerQuery.match(/(?:em|in|daqui(?:\s+a)?)\s+(\d+)\s+dias?|(\d+)\s+days?/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1] ?? daysMatch[2], 10);
    const target = new Date(today);
    target.setDate(target.getDate() + days);
    hints.push(`"em ${days} dias" = ${formatDate(target)}`);
  }

  // "tomorrow" / "amanhã"
  if (/amanh[aã]|tomorrow/i.test(lowerQuery)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    hints.push(`"amanhã" = ${formatDate(tomorrow)}`);
  }

  // Easter (approximate — valid for years around 2024-2030)
  if (/p[aá]scoa|easter/i.test(lowerQuery)) {
    const easter = computeEaster(today.getFullYear());
    hints.push(`"páscoa ${today.getFullYear()}" = ${formatDate(easter)}`);
  }

  // Christmas / Natal
  if (/natal|christmas/i.test(lowerQuery)) {
    const year = today.getMonth() >= 11 ? today.getFullYear() : today.getFullYear();
    const christmas = new Date(year, 11, 25);
    if (christmas < today) {
      christmas.setFullYear(christmas.getFullYear() + 1);
    }
    hints.push(`"natal" = ${formatDate(christmas)}`);
  }

  // New Year / Ano Novo / Réveillon
  if (/ano novo|r[eé]veillon|new year/i.test(lowerQuery)) {
    const newYear = new Date(today.getFullYear() + 1, 0, 1);
    hints.push(`"ano novo" = ${formatDate(newYear)}`);
  }

  // Carnival / Carnaval (47 days before Easter)
  if (/carnaval|carnival/i.test(lowerQuery)) {
    const easter = computeEaster(today.getFullYear());
    const carnival = new Date(easter);
    carnival.setDate(carnival.getDate() - 47);
    if (carnival < today) {
      const nextEaster = computeEaster(today.getFullYear() + 1);
      carnival.setTime(nextEaster.getTime());
      carnival.setDate(carnival.getDate() - 47);
    }
    hints.push(`"carnaval" = ${formatDate(carnival)}`);
  }

  // "next week" / "semana que vem"
  if (/semana que vem|pr[oó]xima semana|next week/i.test(lowerQuery)) {
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + (7 - today.getDay() + 1));
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    hints.push(
      `"semana que vem" = ${formatDate(nextMonday)} a ${formatDate(nextSunday)}`,
    );
  }

  // "this weekend" / "final de semana" / "fim de semana"
  if (/(?:este |esse |nesse? )?(?:final|fim) de semana|this weekend/i.test(lowerQuery)) {
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + (6 - today.getDay()));
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    hints.push(
      `"fim de semana" = ${formatDate(saturday)} a ${formatDate(sunday)}`,
    );
  }

  if (hints.length === 0) return '';
  return '\n\nDatas resolvidas:\n' + hints.join('\n');
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Computus algorithm for Easter date calculation.
 */
function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

// --- Fallback plan generation ---

/**
 * Extract a basic plan from the raw query when Gemini fails.
 * Uses keyword extraction and pattern matching.
 */
async function generateFallbackPlan(rawQuery: string): Promise<SearchPlan> {
  const today = new Date();
  const lowerQuery = rawQuery.toLowerCase();

  // Extract airport codes (3 uppercase letters)
  const iataPattern = /\b([A-Z]{3})\b/g;
  const foundCodes: string[] = [];
  let match;
  while ((match = iataPattern.exec(rawQuery)) !== null) {
    foundCodes.push(match[1]);
  }

  // Try to identify cities by common names
  const cityMappings: Record<string, string[]> = {
    'são paulo': ['GRU', 'CGH', 'VCP'],
    'sp': ['GRU', 'CGH'],
    'rio': ['GIG', 'SDU'],
    'rio de janeiro': ['GIG', 'SDU'],
    'brasilia': ['BSB'],
    'brasília': ['BSB'],
    'new york': ['JFK', 'EWR', 'LGA'],
    'nova york': ['JFK', 'EWR', 'LGA'],
    'ny': ['JFK', 'EWR'],
    'london': ['LHR', 'LGW'],
    'londres': ['LHR', 'LGW'],
    'paris': ['CDG', 'ORY'],
    'tokyo': ['NRT', 'HND'],
    'tóquio': ['NRT', 'HND'],
    'seoul': ['ICN'],
    'seul': ['ICN'],
    'miami': ['MIA', 'FLL'],
    'orlando': ['MCO'],
    'lisboa': ['LIS'],
    'lisbon': ['LIS'],
    'porto': ['OPO'],
    'madrid': ['MAD'],
    'barcelona': ['BCN'],
    'roma': ['FCO'],
    'rome': ['FCO'],
    'dubai': ['DXB'],
    'buenos aires': ['EZE'],
    'santiago': ['SCL'],
    'bogota': ['BOG'],
    'bogotá': ['BOG'],
    'lima': ['LIM'],
    'cancun': ['CUN'],
    'cancún': ['CUN'],
  };

  const detectedCodes: string[] = [...foundCodes];
  for (const [city, codes] of Object.entries(cityMappings)) {
    if (lowerQuery.includes(city)) {
      for (const code of codes) {
        if (!detectedCodes.includes(code)) {
          detectedCodes.push(code);
        }
      }
    }
  }

  // Validate detected codes against the database
  const validCodes: string[] = [];
  for (const code of detectedCodes) {
    if (await validateAirportCode(code)) {
      validCodes.push(code);
    }
  }

  // Determine origin and destination
  let origins: AirportRef[] = [];
  let destinations: AirportRef[] = [];

  if (validCodes.length >= 2) {
    origins = [{ iata: validCodes[0] }];
    destinations = [{ iata: validCodes[1] }];
  } else if (validCodes.length === 1) {
    origins = [{ iata: 'GRU' }]; // Default origin
    destinations = [{ iata: validCodes[0] }];
  } else {
    origins = [{ iata: 'GRU' }];
    destinations = [{ iata: 'GIG' }];
  }

  // Extract dates
  const datePattern = /(\d{4}-\d{2}-\d{2})/g;
  const dates: string[] = [];
  let dateMatch;
  while ((dateMatch = datePattern.exec(rawQuery)) !== null) {
    dates.push(dateMatch[1]);
  }

  // Also try DD/MM/YYYY format
  const brDatePattern = /(\d{2})\/(\d{2})\/(\d{4})/g;
  while ((dateMatch = brDatePattern.exec(rawQuery)) !== null) {
    dates.push(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`);
  }

  let dateFrom: string;
  let dateTo: string;

  if (dates.length >= 2) {
    dateFrom = dates[0];
    dateTo = dates[1];
  } else if (dates.length === 1) {
    dateFrom = dates[0];
    const to = new Date(dates[0]);
    to.setDate(to.getDate() + 7);
    dateTo = formatDate(to);
  } else {
    // Default: next month
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 15);
    dateFrom = formatDate(nextMonth);
    const returnDate = new Date(nextMonth);
    returnDate.setDate(returnDate.getDate() + 7);
    dateTo = formatDate(returnDate);
  }

  // Detect trip type
  let tripType: 'oneway' | 'roundtrip' | 'multi_city' = 'roundtrip';
  if (/ida e volta|roundtrip|round trip|round-trip/i.test(lowerQuery)) {
    tripType = 'roundtrip';
  } else if (/s[oó] ida|one[ -]?way|somente ida/i.test(lowerQuery)) {
    tripType = 'oneway';
  } else if (/→.*→|->.*->|multi[ -]?city|multi[ -]?cit/i.test(lowerQuery)) {
    tripType = 'multi_city';
  }

  // Detect cabin class
  let cabin = 'economy';
  if (/business|executiv/i.test(lowerQuery)) cabin = 'business';
  else if (/first|primeir/i.test(lowerQuery)) cabin = 'first';
  else if (/premium/i.test(lowerQuery)) cabin = 'premium_economy';

  // Detect passengers
  let passengers = 1;
  const paxMatch = lowerQuery.match(/(\d+)\s*(?:passageir|pessoa|passenger|pax|adulto|adult)/i);
  if (paxMatch) passengers = parseInt(paxMatch[1], 10);

  // Detect budget
  let budget: { amount: number; currency: string } | undefined;
  const budgetMatch = rawQuery.match(/(?:R\$|BRL)\s*([\d.,]+)/i);
  if (budgetMatch) {
    budget = {
      amount: parseFloat(budgetMatch[1].replace(/\./g, '').replace(',', '.')),
      currency: 'BRL',
    };
  }
  const usdBudgetMatch = rawQuery.match(/(?:US\$|USD)\s*([\d.,]+)/i);
  if (usdBudgetMatch) {
    budget = {
      amount: parseFloat(usdBudgetMatch[1].replace(/,/g, '')),
      currency: 'USD',
    };
  }

  const dateRange: DateRange = { from: dateFrom, to: dateTo };

  // Build strategies
  const strategies: SearchStrategy[] = [];
  let strategyIdx = 0;

  for (const orig of origins) {
    for (const dest of destinations) {
      strategyIdx++;
      strategies.push({
        id: `fallback-direct-${strategyIdx}`,
        type: 'direct',
        origin: orig.iata,
        destination: dest.iata,
        dateRange,
        priority: 1,
        searchQueries: [
          `voos de ${orig.iata} para ${dest.iata} ${dateFrom}`,
          `flights from ${orig.iata} to ${dest.iata} ${dateFrom}`,
        ],
        expectedSource: 'gemini_search',
      });

      strategyIdx++;
      strategies.push({
        id: `fallback-onestop-${strategyIdx}`,
        type: 'one_stop',
        origin: orig.iata,
        destination: dest.iata,
        dateRange,
        priority: 2,
        searchQueries: [
          `voos baratos ${orig.iata} para ${dest.iata} com 1 parada ${dateFrom}`,
        ],
        expectedSource: 'gemini_search',
      });
    }
  }

  return {
    intent: {
      origins,
      destinations,
      dateRanges: [dateRange],
      tripType,
      passengers,
      cabin,
      budget,
      flexibility: 3,
    },
    strategies,
    reasoning: `Plano gerado por fallback (sem IA). Origens: ${origins.map((o) => o.iata).join(',')}. Destinos: ${destinations.map((d) => d.iata).join(',')}.`,
  };
}

// --- Multi-city detection & handling ---

/**
 * Detect multi-city route patterns like "SP → Tokyo → Seoul → SP"
 */
function detectMultiCityLegs(rawQuery: string): string[] | null {
  // Match patterns: A → B → C, A -> B -> C, A - B - C
  const separators = /\s*(?:→|->|➡️|=>|–>)\s*/;
  const parts = rawQuery.split(separators);

  if (parts.length >= 3) {
    return parts.map((p) => p.trim()).filter((p) => p.length > 0);
  }

  return null;
}

// --- Main agent function ---

export async function runPlannerAgent(
  apiKey: string,
  rawQuery: string,
  onStep: (step: AgentStep) => void,
): Promise<{ plan: SearchPlan; tokensUsed: number; latencyMs: number }> {
  const start = Date.now();
  const today = new Date();

  onStep({
    agent: 'planner',
    step: 1,
    action: 'Analisando intenção de viagem',
    status: 'running',
    timestamp: Date.now(),
  });

  // Resolve relative dates to add hints to the prompt
  const dateHints = resolveRelativeDates(rawQuery, today);

  // Detect multi-city patterns
  const multiCityLegs = detectMultiCityLegs(rawQuery);
  const multiCityHint = multiCityLegs
    ? `\n\nViagem multi-city detectada: ${multiCityLegs.join(' → ')}. Crie legs separados para cada trecho.`
    : '';

  const prompt = `Analise esta intenção de viagem e crie um plano de busca:\n\n"${rawQuery}"\n\nData de hoje: ${formatDate(today)}${dateHints}${multiCityHint}`;

  try {
    const response = await callGemini(apiKey, {
      prompt,
      systemInstruction: PLANNER_SYSTEM,
      responseSchema: PLAN_SCHEMA,
      temperature: 0.1,
    });

    let plan = parseJsonResponse<SearchPlan>(response.text);

    // Validate airport codes against database
    onStep({
      agent: 'planner',
      step: 2,
      action: 'Validando códigos de aeroportos',
      status: 'running',
      timestamp: Date.now(),
    });

    plan = await validateAndFixPlan(plan);

    const latencyMs = Date.now() - start;

    onStep({
      agent: 'planner',
      step: 3,
      action: `Plano gerado: ${plan.strategies.length} estratégias`,
      status: 'completed',
      detail: plan.reasoning,
      timestamp: Date.now(),
    });

    return { plan, tokensUsed: response.tokensUsed, latencyMs };
  } catch (err) {
    onStep({
      agent: 'planner',
      step: 2,
      action: 'Gemini falhou, usando fallback',
      status: 'running',
      detail: (err as Error).message,
      timestamp: Date.now(),
    });

    // Fallback: generate basic plan from keyword extraction
    try {
      const fallbackPlan = await generateFallbackPlan(rawQuery);
      const latencyMs = Date.now() - start;

      onStep({
        agent: 'planner',
        step: 3,
        action: `Plano fallback gerado: ${fallbackPlan.strategies.length} estratégias`,
        status: 'completed',
        detail: fallbackPlan.reasoning,
        timestamp: Date.now(),
      });

      return { plan: fallbackPlan, tokensUsed: 0, latencyMs };
    } catch (fallbackErr) {
      onStep({
        agent: 'planner',
        step: 3,
        action: 'Erro ao gerar plano (incluindo fallback)',
        status: 'error',
        detail: (fallbackErr as Error).message,
        timestamp: Date.now(),
      });
      throw err; // Throw the original Gemini error
    }
  }
}

/**
 * Validate and fix airport codes in the plan.
 * - Checks each code against the database
 * - Tries to fix invalid codes by looking up by city name
 */
async function validateAndFixPlan(plan: SearchPlan): Promise<SearchPlan> {
  const airportCodes = await loadAirportCodes();
  if (airportCodes.size === 0) return plan; // No DB data, skip validation

  // Validate and fix origins
  const fixedOrigins: AirportRef[] = [];
  for (const origin of plan.intent.origins) {
    const code = origin.iata.toUpperCase();
    if (airportCodes.has(code)) {
      fixedOrigins.push({ ...origin, iata: code });
    } else if (origin.name) {
      // Try to find by city name
      const cityAirports = await findAirportsByCity(origin.name);
      if (cityAirports.length > 0) {
        for (const ap of cityAirports) {
          fixedOrigins.push({ iata: ap, name: origin.name });
        }
      } else {
        // Keep the original — it may be a valid code not in our DB
        fixedOrigins.push({ ...origin, iata: code });
      }
    } else {
      fixedOrigins.push({ ...origin, iata: code });
    }
  }

  // Validate and fix destinations
  const fixedDestinations: AirportRef[] = [];
  for (const dest of plan.intent.destinations) {
    const code = dest.iata.toUpperCase();
    if (airportCodes.has(code)) {
      fixedDestinations.push({ ...dest, iata: code });
    } else if (dest.name) {
      const cityAirports = await findAirportsByCity(dest.name);
      if (cityAirports.length > 0) {
        for (const ap of cityAirports) {
          fixedDestinations.push({ iata: ap, name: dest.name });
        }
      } else {
        fixedDestinations.push({ ...dest, iata: code });
      }
    } else {
      fixedDestinations.push({ ...dest, iata: code });
    }
  }

  // Fix strategy airport codes
  const fixedStrategies = plan.strategies.map((s) => ({
    ...s,
    origin: s.origin.toUpperCase(),
    destination: s.destination.toUpperCase(),
  }));

  return {
    ...plan,
    intent: {
      ...plan.intent,
      origins: fixedOrigins.length > 0 ? fixedOrigins : plan.intent.origins,
      destinations: fixedDestinations.length > 0 ? fixedDestinations : plan.intent.destinations,
    },
    strategies: fixedStrategies,
  };
}
