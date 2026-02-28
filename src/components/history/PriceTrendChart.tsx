import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Search } from '../../agents/types';
import { formatPrice } from '../../utils/formatters';

interface PriceTrendChartProps {
  searches: Search[];
  currency?: string;
}

interface TrendDataPoint {
  date: string;
  dateLabel: string;
  avgBudget: number | null;
  searchCount: number;
  route: string;
}

export default function PriceTrendChart({
  searches,
  currency = 'BRL',
}: PriceTrendChartProps) {
  const { data, stats } = useMemo(() => {
    // Group searches by date and aggregate budget info
    const grouped: Record<
      string,
      { budgets: number[]; routes: string[]; count: number }
    > = {};

    for (const s of searches) {
      const dateStr = s.createdAt.split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = { budgets: [], routes: [], count: 0 };
      }
      grouped[dateStr].count += 1;
      if (s.maxBudget) {
        grouped[dateStr].budgets.push(s.maxBudget);
      }
      if (s.parsedOrigin && s.parsedDest) {
        const route = `${s.parsedOrigin}-${s.parsedDest}`;
        if (!grouped[dateStr].routes.includes(route)) {
          grouped[dateStr].routes.push(route);
        }
      }
    }

    const sortedDates = Object.keys(grouped).sort();

    const dataPoints: TrendDataPoint[] = sortedDates.map((dateStr) => {
      const { budgets, routes, count } = grouped[dateStr];
      const avgBudget =
        budgets.length > 0
          ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length)
          : null;

      let dateLabel: string;
      try {
        dateLabel = format(parseISO(dateStr), 'dd/MM', { locale: ptBR });
      } catch {
        dateLabel = dateStr;
      }

      return {
        date: dateStr,
        dateLabel,
        avgBudget,
        searchCount: count,
        route: routes.join(', ') || 'N/A',
      };
    });

    // Calculate stats from budgets
    const allBudgets = searches
      .filter((s) => s.maxBudget)
      .map((s) => s.maxBudget!);

    const globalAvg =
      allBudgets.length > 0
        ? Math.round(allBudgets.reduce((a, b) => a + b, 0) / allBudgets.length)
        : null;

    // Zone thresholds
    const cheapThreshold = globalAvg ? Math.round(globalAvg * 0.7) : null;
    const expensiveThreshold = globalAvg ? Math.round(globalAvg * 1.3) : null;

    return {
      data: dataPoints,
      stats: {
        avg: globalAvg,
        cheapThreshold,
        expensiveThreshold,
        totalSearches: searches.length,
      },
    };
  }, [searches]);

  if (data.length < 2) {
    return null;
  }

  const hasBudgetData = data.some((d) => d.avgBudget !== null);

  if (!hasBudgetData) {
    // Show just search count trend
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Atividade de Buscas
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              width={30}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as TrendDataPoint;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-semibold text-gray-900 mb-1">{d.date}</p>
                    <p className="text-blue-600">
                      {d.searchCount} {d.searchCount === 1 ? 'busca' : 'buscas'}
                    </p>
                    {d.route !== 'N/A' && (
                      <p className="text-gray-400 text-xs mt-1">{d.route}</p>
                    )}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="searchCount"
              stroke="#3b82f6"
              fill="#dbeafe"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Tendencia de Precos por Rota
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            Barato
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            Normal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            Caro
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="priceTrendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
            width={45}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as TrendDataPoint;
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">{d.date}</p>
                  {d.avgBudget !== null && (
                    <p className="text-blue-600">
                      Orcamento medio: {formatPrice(d.avgBudget, currency)}
                    </p>
                  )}
                  <p className="text-gray-500">
                    {d.searchCount} {d.searchCount === 1 ? 'busca' : 'buscas'}
                  </p>
                  {d.route !== 'N/A' && (
                    <p className="text-gray-400 text-xs mt-1">{d.route}</p>
                  )}
                </div>
              );
            }}
          />
          {stats.cheapThreshold && (
            <ReferenceLine
              y={stats.cheapThreshold}
              stroke="#4ade80"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: 'Barato',
                position: 'insideRight',
                fill: '#4ade80',
                fontSize: 10,
              }}
            />
          )}
          {stats.expensiveThreshold && (
            <ReferenceLine
              y={stats.expensiveThreshold}
              stroke="#f87171"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: 'Caro',
                position: 'insideRight',
                fill: '#f87171',
                fontSize: 10,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="avgBudget"
            stroke="#3b82f6"
            fill="url(#priceTrendGradient)"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6' }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-2 text-center text-xs text-gray-400">
        Baseado em {stats.totalSearches} {stats.totalSearches === 1 ? 'busca' : 'buscas'}
        {stats.avg && ` | Orcamento medio: ${formatPrice(stats.avg, currency)}`}
      </div>
    </div>
  );
}
