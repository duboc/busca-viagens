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

interface RouteData {
  route: string;
  avgPrice: number;
  count: number;
}

const COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308',
];

export default function PriceByRouteChart() {
  const [data, setData] = useState<RouteData[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();
        const results = db.exec(
          `SELECT outbound_origin || '\u2192' || outbound_dest as route,
                  AVG(price) as avgPrice,
                  COUNT(*) as count
           FROM flights
           GROUP BY route
           ORDER BY count DESC
           LIMIT 10`
        );
        if (results.length > 0) {
          const rows = results[0].values.map((row) => ({
            route: String(row[0]),
            avgPrice: Math.round(Number(row[1])),
            count: Number(row[2]),
          }));
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
        Preco Medio por Rota
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="route"
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
              const d = payload[0].payload as RouteData;
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900 mb-1">{d.route}</p>
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
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
