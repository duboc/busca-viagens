import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getFlexDatePrices } from '../../db/repositories/FlightRepository';
import { formatPrice } from '../../utils/formatters';
import { useSearch } from '../../hooks/useSearch';

interface FlexDateMatrixProps {
  origin: string;
  destination: string;
  baseDate?: string;
}

export default function FlexDateMatrix({
  origin,
  destination,
  baseDate,
}: FlexDateMatrixProps) {
  const { search } = useSearch();
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const base = useMemo(() => {
    if (baseDate) {
      try {
        return parseISO(baseDate);
      } catch {
        return new Date();
      }
    }
    return new Date();
  }, [baseDate]);

  const departureDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => format(addDays(base, i), 'yyyy-MM-dd')),
    [base],
  );

  const returnDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => format(addDays(base, i + 1), 'yyyy-MM-dd')),
    [base],
  );

  const loadMatrix = useCallback(async () => {
    if (!origin || !destination) return;
    setLoading(true);
    try {
      const data = await getFlexDatePrices(origin, destination, departureDates, returnDates);
      setMatrix(data);
    } catch (err) {
      console.error('Failed to load flex date matrix:', err);
      setMatrix({});
    } finally {
      setLoading(false);
    }
  }, [origin, destination, departureDates, returnDates]);

  useEffect(() => {
    if (expanded) {
      loadMatrix();
    }
  }, [expanded, loadMatrix]);

  // Calculate min and max prices for color coding
  const { minPrice, maxPrice } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const dep of departureDates) {
      for (const ret of returnDates) {
        const price = matrix[dep]?.[ret];
        if (price !== undefined) {
          if (price < min) min = price;
          if (price > max) max = price;
        }
      }
    }
    return { minPrice: min === Infinity ? 0 : min, maxPrice: max === -Infinity ? 0 : max };
  }, [matrix, departureDates, returnDates]);

  const getCellColor = useCallback(
    (price: number | undefined): string => {
      if (price === undefined) return 'bg-gray-50 text-gray-300';
      if (minPrice === maxPrice) return 'bg-green-100 text-green-800';

      const ratio = (price - minPrice) / (maxPrice - minPrice);
      if (ratio <= 0.25) return 'bg-green-100 text-green-800 font-semibold';
      if (ratio <= 0.5) return 'bg-green-50 text-green-700';
      if (ratio <= 0.75) return 'bg-orange-50 text-orange-700';
      return 'bg-red-50 text-red-700';
    },
    [minPrice, maxPrice],
  );

  const formatShortDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM (EEE)', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const handleCellClick = (depDate: string, retDate: string) => {
    search(`Voo de ${origin} para ${destination} saindo ${depDate} voltando ${retDate}`);
  };

  const hasData = useMemo(() => {
    for (const dep of departureDates) {
      for (const ret of returnDates) {
        if (matrix[dep]?.[ret] !== undefined) return true;
      }
    }
    return false;
  }, [matrix, departureDates, returnDates]);

  if (!origin || !destination) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">
            Matriz de datas flexiveis
          </span>
          <span className="text-xs text-gray-400">
            {origin} &rarr; {destination}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <span className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span className="ml-2 text-sm text-gray-500">Carregando precos...</span>
            </div>
          )}

          {!loading && !hasData && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">
                Nenhum dado de precos encontrado para esta rota.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Faca buscas nesta rota para popular a matriz de precos.
              </p>
            </div>
          )}

          {!loading && hasData && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-gray-500 font-medium border-b border-gray-100">
                        Ida / Volta
                      </th>
                      {returnDates.map((ret) => (
                        <th
                          key={ret}
                          className="p-2 text-center text-gray-500 font-medium border-b border-gray-100 whitespace-nowrap"
                        >
                          {formatShortDate(ret)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {departureDates.map((dep) => (
                      <tr key={dep}>
                        <td className="p-2 text-gray-600 font-medium whitespace-nowrap border-b border-gray-50">
                          {formatShortDate(dep)}
                        </td>
                        {returnDates.map((ret) => {
                          const price = matrix[dep]?.[ret];
                          const isMin = price !== undefined && price === minPrice;
                          return (
                            <td
                              key={ret}
                              onClick={() =>
                                price !== undefined && handleCellClick(dep, ret)
                              }
                              className={`p-2 text-center border-b border-gray-50 transition-colors whitespace-nowrap ${getCellColor(price)} ${
                                price !== undefined
                                  ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-inset'
                                  : ''
                              } ${isMin ? 'ring-2 ring-green-500 ring-inset' : ''}`}
                              title={
                                price !== undefined
                                  ? `${formatPrice(price)} - Ida: ${dep}, Volta: ${ret}`
                                  : 'Sem dados'
                              }
                            >
                              {price !== undefined ? formatPrice(price) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-100 border border-green-200" />
                  <span>Mais barato</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-orange-50 border border-orange-200" />
                  <span>Intermediario</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-50 border border-red-200" />
                  <span>Mais caro</span>
                </div>
                <span className="ml-auto text-gray-400">
                  Clique em uma celula para buscar
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
