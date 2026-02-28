import { useEffect, useState } from 'react';
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
import { getDatabase } from '../../db/database';
import { formatPrice } from '../../utils/formatters';

interface TimeData {
  period: string;
  avgPrice: number;
  count: number;
}

export default function PriceOverTimeChart() {
  const [data, setData] = useState<TimeData[]>([]);
  const [globalAvg, setGlobalAvg] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();

        // Group by week using strftime
        const results = db.exec(
          `SELECT strftime('%Y-%W', created_at) as period,
                  AVG(price) as avgPrice,
                  COUNT(*) as count
           FROM flights
           WHERE created_at IS NOT NULL
           GROUP BY period
           ORDER BY period ASC`
        );

        if (results.length > 0) {
          const rows = results[0].values.map((row) => {
            const raw = String(row[0]); // e.g. "2025-04"
            const [year, week] = raw.split('-');
            return {
              period: `S${week}/${year.slice(2)}`,
              avgPrice: Math.round(Number(row[1])),
              count: Number(row[2]),
            };
          });
          setData(rows);

          // Compute global average
          const total = rows.reduce((sum, r) => sum + r.avgPrice * r.count, 0);
          const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
          setGlobalAvg(totalCount > 0 ? Math.round(total / totalCount) : 0);
        }
      } catch {
        // silently handle
      }
    })();
  }, []);

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Evolucao de Precos ao Longo do Tempo
        </h3>
        {globalAvg > 0 && (
          <span className="text-xs text-gray-400">
            Media geral: {formatPrice(globalAvg)}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <defs>
            <linearGradient id="priceOverTimeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="period"
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
            width={50}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as TimeData;
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">
                    Semana {d.period}
                  </p>
                  <p className="text-blue-600">
                    Preco medio: {formatPrice(d.avgPrice)}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {d.count} {d.count === 1 ? 'voo' : 'voos'}
                  </p>
                </div>
              );
            }}
          />
          {globalAvg > 0 && (
            <ReferenceLine
              y={globalAvg}
              stroke="#93c5fd"
              strokeDasharray="5 5"
              strokeWidth={1}
              label={{
                value: 'Media',
                position: 'insideRight',
                fill: '#93c5fd',
                fontSize: 10,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="avgPrice"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, fill: '#3b82f6' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
