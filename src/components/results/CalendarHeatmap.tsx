import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  isSameMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Flight } from '../../agents/types';
import { formatPrice } from '../../utils/formatters';

interface CalendarHeatmapProps {
  flights: Flight[];
  month: Date;
  currency?: string;
}

export default function CalendarHeatmap({
  flights,
  month,
  currency = 'BRL',
}: CalendarHeatmapProps) {
  const { priceMap, minPrice, maxPrice } = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of flights) {
      const day = f.outboundDeparture.split('T')[0];
      if (!map[day] || f.price < map[day]) {
        map[day] = f.price;
      }
    }
    const prices = Object.values(map);
    return {
      priceMap: map,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
    };
  }, [flights]);

  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const startDay = getDay(start);

  // Pad start to align with weekday
  const paddedDays: (Date | null)[] = [
    ...Array.from<null>({ length: startDay }).fill(null),
    ...days,
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Preços por dia — {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
      </h3>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">
            {d}
          </div>
        ))}

        {paddedDays.map((day, i) => {
          if (!day) {
            return <div key={`pad-${i}`} />;
          }

          const dateStr = format(day, 'yyyy-MM-dd');
          const price = priceMap[dateStr];
          const color = price ? getColor(price, minPrice, maxPrice) : undefined;

          return (
            <div
              key={dateStr}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs
                ${isSameMonth(day, month) ? '' : 'opacity-30'}
                ${price ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''}`}
              style={price ? { backgroundColor: color + '20', color } : undefined}
              title={price ? `${format(day, 'dd/MM')}: ${formatPrice(price, currency)}` : undefined}
            >
              <span className="font-medium">{format(day, 'd')}</span>
              {price && (
                <span className="text-[10px] font-bold" style={{ color }}>
                  {formatCompactPrice(price)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
        <span>
          <span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: '#22c55e' }} />
          {'< '}{formatPrice(minPrice + (maxPrice - minPrice) * 0.25, currency)}
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: '#eab308' }} />
          Médio
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: '#f97316' }} />
          Caro
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: '#ef4444' }} />
          {'> '}{formatPrice(minPrice + (maxPrice - minPrice) * 0.75, currency)}
        </span>
      </div>
    </div>
  );
}

function getColor(price: number, min: number, max: number): string {
  const range = max - min || 1;
  const ratio = (price - min) / range;
  if (ratio <= 0.25) return '#22c55e';
  if (ratio <= 0.5) return '#eab308';
  if (ratio <= 0.75) return '#f97316';
  return '#ef4444';
}

function formatCompactPrice(price: number): string {
  if (price >= 1000) return `${(price / 1000).toFixed(1)}k`;
  return String(Math.round(price));
}
