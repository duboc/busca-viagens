import { describe, it, expect } from 'vitest';
import { parseJsonResponse } from '../services/gemini';

describe('parseJsonResponse', () => {
  it('parses valid JSON string', () => {
    const json = '{"name": "test", "value": 42}';
    const result = parseJsonResponse<{ name: string; value: number }>(json);

    expect(result.name).toBe('test');
    expect(result.value).toBe(42);
  });

  it('parses JSON wrapped in markdown code blocks', () => {
    const json = '```json\n{"name": "test", "value": 42}\n```';
    const result = parseJsonResponse<{ name: string; value: number }>(json);

    expect(result.name).toBe('test');
    expect(result.value).toBe(42);
  });

  it('parses JSON wrapped in plain code blocks', () => {
    const json = '```\n{"name": "test"}\n```';
    const result = parseJsonResponse<{ name: string }>(json);

    expect(result.name).toBe('test');
  });

  it('parses JSON with leading/trailing whitespace', () => {
    const json = '  \n  {"name": "test"}  \n  ';
    const result = parseJsonResponse<{ name: string }>(json);

    expect(result.name).toBe('test');
  });

  it('parses JSON arrays', () => {
    const json = '[1, 2, 3]';
    const result = parseJsonResponse<number[]>(json);

    expect(result).toEqual([1, 2, 3]);
  });

  it('parses nested JSON objects', () => {
    const json = '{"rankings": [{"id": "1", "score": 85}]}';
    const result = parseJsonResponse<{ rankings: Array<{ id: string; score: number }> }>(json);

    expect(result.rankings).toHaveLength(1);
    expect(result.rankings[0].id).toBe('1');
    expect(result.rankings[0].score).toBe(85);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseJsonResponse('not valid json')).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => parseJsonResponse('')).toThrow();
  });

  it('throws on malformed JSON', () => {
    expect(() => parseJsonResponse('{"incomplete')).toThrow();
  });

  it('handles JSON in code block without trailing newline', () => {
    const json = '```json{"name": "test"}```';
    const result = parseJsonResponse<{ name: string }>(json);

    expect(result.name).toBe('test');
  });

  it('parses complex flight ranking response', () => {
    const json = `\`\`\`json
{
  "rankings": [
    {
      "id": "flight-1",
      "rank_score": 92,
      "reasoning": "Melhor preço com duração razoável",
      "badges": ["best_price", "recommended"]
    },
    {
      "id": "flight-2",
      "rank_score": 78,
      "reasoning": "Voo mais curto",
      "badges": ["shortest"]
    }
  ]
}
\`\`\``;

    interface RankerResponse {
      rankings: Array<{
        id: string;
        rank_score: number;
        reasoning: string;
        badges: string[];
      }>;
    }

    const result = parseJsonResponse<RankerResponse>(json);
    expect(result.rankings).toHaveLength(2);
    expect(result.rankings[0].rank_score).toBe(92);
    expect(result.rankings[1].badges).toContain('shortest');
  });
});
