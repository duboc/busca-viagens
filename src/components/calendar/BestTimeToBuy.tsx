import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getBestTimeToBuy } from '../../services/farePrediction';
import { getPriceHistory } from '../../db/repositories/PriceHistoryRepository';
import type { BestTimeToBuyInfo, PriceHistoryEntry } from '../../agents/types';

const MONTH_NAMES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface Props {
  origin: string;
  destination: string;
}

export default function BestTimeToBuy({ origin, destination }: Props) {
  const [info, setInfo] = useState<BestTimeToBuyInfo | null>(null);
  const [chartData, setChartData] = useState<{ date: string; price: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!origin || !destination) return;

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [bestTime, history] = await Promise.all([
          getBestTimeToBuy(origin, destination),
          getPriceHistory(origin, destination),
        ]);

        if (cancelled) return;

        setInfo(bestTime);

        // Build mini chart data: last 30 entries or all if fewer
        const recent = history.slice(-30);
        const data = recent.map((h: PriceHistoryEntry) => ({
          date: h.departureDate,
          price: h.price,
        }));
        setChartData(data);
      } catch (err) {
        console.error('Error loading best time to buy:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [origin, destination]);

  if (!origin || !destination) return null;

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800 transition-colors">
        <div className="animate-pulse flex gap-4">
          <div className="h-16 w-16 bg-blue-200 dark:bg-blue-700 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-blue-200 dark:bg-blue-700 rounded w-3/4" />
            <div className="h-4 bg-blue-200 dark:bg-blue-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!info || (info.priceRange.min === 0 && info.priceRange.max === 0)) {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-colors">
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
          Selecione origem e destino para ver recomendações de compra.
        </p>
      </div>
    );
  }

  const cheapMonthNames = info.cheapestMonths.map((m) => MONTH_NAMES[m]).filter(Boolean);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800 transition-colors">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Melhor Momento para Comprar
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Best day of week */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-colors">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Melhor dia para comprar
          </p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {info.bestDayName}
          </p>
          {info.avgSavings > 0 && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Economia média de R$ {info.avgSavings.toFixed(0)}
            </p>
          )}
        </div>

        {/* Cheapest months */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-colors">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Meses mais baratos
          </p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {cheapMonthNames.length > 0 ? cheapMonthNames.join(', ') : 'Sem dados'}
          </p>
        </div>

        {/* Price range */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-colors">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Faixa de preço (30 dias)
          </p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            R$ {info.priceRange.min.toFixed(0)} – R$ {info.priceRange.max.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Mini line chart */}
      {chartData.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-colors">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Tendência de preços recentes
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-gray-800, #1f2937)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`R$ ${value.toFixed(0)}`, 'Preço']}
                labelFormatter={(label: string) => `Data: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
