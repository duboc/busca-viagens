import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getDatabase } from '../../db/database';

interface ActivityData {
  date: string;
  label: string;
  searches: number;
}

export default function SearchActivityChart() {
  const [data, setData] = useState<ActivityData[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();
        const results = db.exec(
          `SELECT DATE(created_at) as day,
                  COUNT(*) as searches
           FROM searches
           WHERE created_at IS NOT NULL
           GROUP BY day
           ORDER BY day ASC`
        );

        if (results.length > 0) {
          const rows = results[0].values.map((row) => {
            const dateStr = String(row[0]);
            // Format as dd/MM
            const parts = dateStr.split('-');
            const label = parts.length >= 3
              ? `${parts[2]}/${parts[1]}`
              : dateStr;
            return {
              date: dateStr,
              label,
              searches: Number(row[1]),
            };
          });
          setData(rows);
        }
      } catch {
        // silently handle
      }
    })();
  }, []);

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Atividade de Buscas
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <defs>
            <linearGradient id="searchActivityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
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
              const d = payload[0].payload as ActivityData;
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">{d.date}</p>
                  <p className="text-purple-600">
                    {d.searches} {d.searches === 1 ? 'busca' : 'buscas'}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="searches"
            stroke="#8b5cf6"
            fill="url(#searchActivityGradient)"
            strokeWidth={2}
            dot={{ r: 3, fill: '#8b5cf6' }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
