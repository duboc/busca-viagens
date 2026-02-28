import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getDatabase } from '../../db/database';
import { formatPrice } from '../../utils/formatters';

interface DayData {
  dayIndex: number;
  day: string;
  avgPrice: number;
  count: number;
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

export default function BestDayChart() {
  const [data, setData] = useState<DayData[]>([]);
  const [cheapestDay, setCheapestDay] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();
        // strftime('%w') returns 0=Sunday, 1=Monday, ..., 6=Saturday
        const results = db.exec(
          `SELECT CAST(strftime('%w', outbound_departure) AS INTEGER) as dayOfWeek,
                  AVG(price) as avgPrice,
                  COUNT(*) as count
           FROM flights
           WHERE outbound_departure IS NOT NULL
           GROUP BY dayOfWeek
           ORDER BY dayOfWeek ASC`
        );

        if (results.length > 0) {
          const rows = results[0].values.map((row) => {
            const dayIndex = Number(row[0]);
            return {
              dayIndex,
              day: DAY_NAMES[dayIndex] ?? `Dia ${dayIndex}`,
              avgPrice: Math.round(Number(row[1])),
              count: Number(row[2]),
            };
          });
          setData(rows);

          // Find cheapest day
          if (rows.length > 0) {
            const cheapest = rows.reduce((min, r) =>
              r.avgPrice < min.avgPrice ? r : min
            );
            setCheapestDay(cheapest.day);
          }
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
          Melhor Dia para Partir
        </h3>
        {cheapestDay && (
          <span className="text-xs text-green-600 font-medium">
            Mais barato: {cheapestDay}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="day"
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
              const d = payload[0].payload as DayData;
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">{d.day}</p>
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
          <Bar dataKey="avgPrice" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.day}
                fill={entry.day === cheapestDay ? '#22c55e' : '#3b82f6'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
