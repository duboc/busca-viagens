import { GEMINI_API_URL, GEMINI_MODEL, RATE_LIMIT } from '../utils/constants';

interface GeminiRequest {
  prompt: string;
  systemInstruction?: string;
  useSearch?: boolean;
  responseSchema?: Record<string, unknown>;
  temperature?: number;
}

interface GeminiResponse {
  text: string;
  groundingMetadata?: {
    webSearchQueries?: string[];
    groundingChunks?: Array<{ web?: { uri: string; title: string } }>;
  };
  tokensUsed: number;
}

const callTimestamps: number[] = [];

function checkRateLimit(): void {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;
  while (callTimestamps.length > 0 && callTimestamps[0] < windowStart) {
    callTimestamps.shift();
  }
  if (callTimestamps.length >= RATE_LIMIT.maxRequests) {
    const waitMs = callTimestamps[0] + RATE_LIMIT.windowMs - now;
    throw new Error(`Rate limit reached. Try again in ${Math.ceil(waitMs / 1000)}s.`);
  }
}

export async function callGemini(
  apiKey: string,
  request: GeminiRequest,
): Promise<GeminiResponse> {
  checkRateLimit();
  callTimestamps.push(Date.now());

  const body: Record<string, unknown> = {
    contents: [
      {
        parts: [{ text: request.prompt }],
      },
    ],
    generationConfig: {
      temperature: request.temperature ?? 0.2,
      topP: 0.8,
      maxOutputTokens: 8192,
    },
  };

  if (request.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: request.systemInstruction }],
    };
  }

  if (request.useSearch) {
    body.tools = [{ google_search: {} }];
  }

  if (request.responseSchema) {
    (body.generationConfig as Record<string, unknown>).responseMimeType =
      'application/json';
    (body.generationConfig as Record<string, unknown>).responseSchema =
      request.responseSchema;
  }

  const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      if (!candidate) {
        throw new Error('No response from Gemini');
      }

      const text = candidate.content?.parts
        ?.map((p: { text?: string }) => p.text ?? '')
        .join('') ?? '';

      const tokensUsed =
        (data.usageMetadata?.totalTokenCount as number) ?? 0;

      return {
        text,
        groundingMetadata: candidate.groundingMetadata,
        tokensUsed,
      };
    } catch (err) {
      lastError = err as Error;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError ?? new Error('Gemini request failed');
}

export function parseJsonResponse<T>(text: string): T {
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  return JSON.parse(cleaned) as T;
}
