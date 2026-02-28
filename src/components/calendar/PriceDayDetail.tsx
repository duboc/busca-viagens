import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPriceHistory } from '../../db/repositories/PriceHistoryRepository';
import { predictPriceTrend } from '../../services/farePrediction';
import type { FarePrediction, PriceHistoryEntry } from '../../agents/types';

interface Props {
  origin: string;
  destination: string;
  date: Date;
  minPrice?: number;
  onClose: () => void;
}

export default function PriceDayDetail({ origin, destination, date, minPrice, onClose }: Props) {
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState<FarePrediction | null>(null);
  const [sparkData, setSparkData] = useState<{ date: string; price: number }[]>([]);
  const [stats, setStats] = useState<{ min: number; max: number; avg: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const dateStr = format(date, 'yyyy-MM-dd');
  const displayDate = format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [pred, history] = await Promise.all([
          predictPriceTrend(origin, destination, dateStr),
          getPriceHistory(origin, destination),
        ]);

        if (cancelled) return;

        setPrediction(pred);

        // Filter history entries for this specific departure date
        const datePrices = history.filter((h: PriceHistoryEntry) => h.departureDate === dateStr);

        if (datePrices.length > 0) {
          const prices = datePrices.map((h: PriceHistoryEntry) => h.price);
          setStats({
            min: Math.min(...prices),
            max: Math.max(...prices),
            avg: prices.reduce((a, b) => a + b, 0) / prices.length,
          });

          // Spark chart data: price over time for this date
          setSparkData(
            datePrices.map((h: PriceHistoryEntry) => ({
              date: h.recordedAt,
              price: h.price,
            })),
          );
        } else if (minPrice) {
          // Use the minimum price from the calendar as a fallback
          setStats({ min: minPrice, max: minPrice, avg: minPrice });
        }
      } catch (err) {
        console.error('Error loading day detail:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [origin, destination, dateStr, minPrice]);

  function handleSearchFlights() {
    const params = new URLSearchParams({
      origin,
      destination,
      dateFrom: dateStr,
    });
    navigate(`/?${params.toString()}`);
  }

  function handleCreateAlert() {
    const params = new URLSearchParams({
      origin,
      destination,
      date: dateStr,
    });
    navigate(`/alerts?${params.toString()}`);
  }

  const trendIcon = prediction
    ? prediction.trend === 'rising'
      ? '↑'
      : prediction.trend === 'falling'
        ? '↓'
        : '→'
    : '→';

  const trendColor = prediction
    ? prediction.trend === 'rising'
      ? 'text-red-500'
      : prediction.trend === 'falling'
        ? 'text-green-500'
        : 'text-gray-500'
    : 'text-gray-500';

  const trendLabel = prediction
    ? prediction.trend === 'rising'
      ? 'Em alta'
      : prediction.trend === 'falling'
        ? 'Em queda'
        : 'Estável'
    : 'Estável';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-6 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
          {displayDate}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ) : (
        <>
          {/* Price stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg transition-colors">
              <p className="text-xs text-gray-500 dark:text-gray-400">Mínimo</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {stats ? `R$ ${stats.min.toFixed(0)}` : '—'}
              </p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors">
              <p className="text-xs text-gray-500 dark:text-gray-400">Média</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {stats ? `R$ ${stats.avg.toFixed(0)}` : '—'}
              </p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors">
              <p className="text-xs text-gray-500 dark:text-gray-400">Máximo</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {stats ? `R$ ${stats.max.toFixed(0)}` : '—'}
              </p>
            </div>
          </div>

          {/* Trend & confidence */}
          {prediction && (
            <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors">
              <div className="flex items-center gap-2">
                <span className={`text-2xl ${trendColor}`}>{trendIcon}</span>
                <div>
                  <p className={`font-semibold ${trendColor}`}>{trendLabel}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Confiança: {(prediction.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              {prediction.predictedPrice > 0 && (
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Preço previsto</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    R$ {prediction.predictedPrice.toFixed(0)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Recommendation */}
          {prediction && prediction.recommendation && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg transition-colors">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {prediction.recommendation}
              </p>
            </div>
          )}

          {/* Spark chart */}
          {sparkData.length > 1 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Histórico de preços para esta data
              </p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={sparkData}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`R$ ${value.toFixed(0)}`, 'Preço']}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSearchFlights}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Buscar voos
            </button>
            <button
              onClick={handleCreateAlert}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Criar alerta
            </button>
          </div>
        </>
      )}
    </div>
  );
}
