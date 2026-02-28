import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AirportAutocomplete from '../search/AirportAutocomplete';
import BestTimeToBuy from './BestTimeToBuy';
import PriceDayDetail from './PriceDayDetail';
import { getMonthlyPriceMap } from '../../db/repositories/PriceHistoryRepository';
import { getMonthPredictions } from '../../services/farePrediction';
import { recordPricesFromFlights } from '../../db/repositories/PriceHistoryRepository';
import type { FarePrediction } from '../../agents/types';

const WEEKDAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function FareCalendarPage() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [priceMap, setPriceMap] = useState<Record<number, number>>({});
  const [predictions, setPredictions] = useState<Record<number, FarePrediction>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [backfilled, setBackfilled] = useState(false);

  // Backfill price history from flights on first load
  useEffect(() => {
    if (!backfilled) {
      recordPricesFromFlights()
        .then(() => setBackfilled(true))
        .catch(console.error);
    }
  }, [backfilled]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1; // 1-indexed

  const loadCalendarData = useCallback(async () => {
    if (!origin || !destination) {
      setPriceMap({});
      setPredictions({});
      return;
    }

    setLoading(true);
    try {
      const [prices, preds] = await Promise.all([
        getMonthlyPriceMap(origin, destination, year, month),
        getMonthPredictions(origin, destination, year, month),
      ]);
      setPriceMap(prices);
      setPredictions(preds);
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  }, [origin, destination, year, month]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Build calendar grid days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Calculate median price for color coding
  const prices = Object.values(priceMap);
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const median = sortedPrices.length > 0 ? sortedPrices[Math.floor(sortedPrices.length / 2)] : 0;
  const q1 = sortedPrices.length > 0 ? sortedPrices[Math.floor(sortedPrices.length * 0.25)] : 0;
  const q3 = sortedPrices.length > 0 ? sortedPrices[Math.floor(sortedPrices.length * 0.75)] : 0;

  function getPriceColor(price: number): string {
    if (price <= q1) return 'text-green-600 dark:text-green-400';
    if (price <= median) return 'text-green-500 dark:text-green-300';
    if (price <= q3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  function getPriceBgColor(price: number): string {
    if (price <= q1) return 'bg-green-50 dark:bg-green-900/20';
    if (price <= median) return 'bg-green-50/50 dark:bg-green-900/10';
    if (price <= q3) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  }

  function getTrendIndicator(day: number): { icon: string; color: string } | null {
    const pred = predictions[day];
    if (!pred) return null;

    switch (pred.trend) {
      case 'rising':
        return { icon: '↑', color: 'text-red-500 dark:text-red-400' };
      case 'falling':
        return { icon: '↓', color: 'text-green-500 dark:text-green-400' };
      case 'stable':
        return { icon: '→', color: 'text-gray-400 dark:text-gray-500' };
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">
          Calendário de Tarifas
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">
          Visualize preços por data e descubra o melhor momento para comprar.
        </p>
      </div>

      {/* Route selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AirportAutocomplete
            label="Origem"
            value={origin}
            onChange={setOrigin}
            placeholder="De onde?"
          />
          <AirportAutocomplete
            label="Destino"
            value={destination}
            onChange={setDestination}
            placeholder="Para onde?"
          />
        </div>
      </div>

      {/* Best time to buy card */}
      <BestTimeToBuy origin={origin} destination={destination} />

      {/* Calendar section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 transition-colors">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            &lt;
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize transition-colors">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            &gt;
          </button>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}

        {/* Calendar grid */}
        {!loading && (
          <>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAY_HEADERS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2 transition-colors"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayNum = day.getDate();
                const inMonth = isSameMonth(day, currentMonth);
                const price = inMonth ? priceMap[dayNum] : undefined;
                const trend = inMonth ? getTrendIndicator(dayNum) : null;
                const today = isToday(day);
                const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => inMonth && setSelectedDate(day)}
                    disabled={!inMonth}
                    className={`
                      relative p-2 min-h-[72px] rounded-lg text-left transition-colors
                      ${!inMonth ? 'opacity-30 cursor-default' : 'cursor-pointer hover:ring-2 hover:ring-blue-400'}
                      ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''}
                      ${today && !isSelected ? 'ring-1 ring-blue-300 dark:ring-blue-600' : ''}
                      ${price !== undefined ? getPriceBgColor(price) : 'bg-gray-50 dark:bg-gray-700/30'}
                    `}
                  >
                    {/* Day number */}
                    <span
                      className={`text-sm font-medium ${
                        today
                          ? 'text-blue-600 dark:text-blue-400'
                          : inMonth
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-600'
                      } transition-colors`}
                    >
                      {dayNum}
                    </span>

                    {/* Price */}
                    {price !== undefined && (
                      <div className={`text-xs font-semibold mt-1 ${getPriceColor(price)}`}>
                        R$ {price >= 1000 ? `${(price / 1000).toFixed(1)}k` : price.toFixed(0)}
                      </div>
                    )}

                    {/* Trend indicator */}
                    {trend && (
                      <span className={`absolute top-1 right-1 text-xs ${trend.color}`}>
                        {trend.icon}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Preços:</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700" />
              Barato
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700" />
              Médio
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700" />
              Caro
            </span>
            <span className="mx-2 border-l border-gray-300 dark:border-gray-600 h-4" />
            <span className="font-medium">Tendência:</span>
            <span className="flex items-center gap-1">
              <span className="text-red-500">↑</span> Em alta
            </span>
            <span className="flex items-center gap-1">
              <span className="text-green-500">↓</span> Em queda
            </span>
            <span className="flex items-center gap-1">
              <span className="text-gray-400">→</span> Estável
            </span>
          </div>
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDate && origin && destination && (
        <PriceDayDetail
          origin={origin}
          destination={destination}
          date={selectedDate}
          minPrice={priceMap[selectedDate.getDate()]}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* No route selected message */}
      {(!origin || !destination) && (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 transition-colors">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-lg font-medium">Selecione origem e destino</p>
          <p className="text-sm mt-1">
            Escolha uma rota para ver o calendário de tarifas e previsões de preços.
          </p>
        </div>
      )}
    </div>
  );
}
