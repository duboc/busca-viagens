import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Flight } from '../../agents/types';
import { formatPrice } from '../../utils/formatters';

interface PriceChartProps {
  flights: Flight[];
  currency: string;
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  count: number;
}

export default function PriceChart({ flights, currency }: PriceChartProps) {
  const { data, stats } = useMemo(() => {
    const grouped: Record<
      string,
      { prices: number[]; date: string }
    > = {};

    for (const f of flights) {
      const dateStr = f.outboundDeparture.split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = { prices: [], date: dateStr };
      }
      grouped[dateStr].prices.push(f.price);
    }

    const sortedDates = Object.keys(grouped).sort();

    const dataPoints: ChartDataPoint[] = sortedDates.map((dateStr) => {
      const { prices } = grouped[dateStr];
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

      let dateLabel: string;
      try {
        dateLabel = format(parseISO(dateStr), 'dd/MM', { locale: ptBR });
      } catch {
        dateLabel = dateStr;
      }

      return {
        date: dateStr,
        dateLabel,
        minPrice: min,
        maxPrice: max,
        avgPrice: avg,
        count: prices.length,
      };
    });

    const allPrices = flights.map((f) => f.price);
    const globalMin = allPrices.length ? Math.min(...allPrices) : 0;
    const globalMax = allPrices.length ? Math.max(...allPrices) : 0;
    const globalAvg = allPrices.length
      ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length)
      : 0;

    return {
      data: dataPoints,
      stats: { min: globalMin, max: globalMax, avg: globalAvg },
    };
  }, [flights]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Tendencia de Precos
        </h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-green-500 inline-block rounded" />
            Min: {formatPrice(stats.min, currency)}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-blue-500 inline-block rounded" />
            Media: {formatPrice(stats.avg, currency)}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-red-400 inline-block rounded" />
            Max: {formatPrice(stats.max, currency)}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
              const d = payload[0].payload as ChartDataPoint;
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">{d.date}</p>
                  <div className="space-y-0.5">
                    <p className="text-green-600">
                      Min: {formatPrice(d.minPrice, currency)}
                    </p>
                    <p className="text-blue-600">
                      Media: {formatPrice(d.avgPrice, currency)}
                    </p>
                    <p className="text-red-500">
                      Max: {formatPrice(d.maxPrice, currency)}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {d.count} {d.count === 1 ? 'voo' : 'voos'}
                    </p>
                  </div>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={stats.avg}
            stroke="#93c5fd"
            strokeDasharray="5 5"
            strokeWidth={1}
          />
          <Line
            type="monotone"
            dataKey="minPrice"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 3, fill: '#22c55e' }}
            activeDot={{ r: 5 }}
            name="Min"
          />
          <Line
            type="monotone"
            dataKey="avgPrice"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6' }}
            activeDot={{ r: 5 }}
            name="Media"
          />
          <Line
            type="monotone"
            dataKey="maxPrice"
            stroke="#f87171"
            strokeWidth={1.5}
            dot={{ r: 2, fill: '#f87171' }}
            strokeDasharray="4 2"
            name="Max"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
