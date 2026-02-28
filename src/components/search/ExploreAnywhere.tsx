import { useState, useEffect, useCallback } from 'react';
import { useSearchStore } from '../../stores/searchStore';
import { useSearch } from '../../hooks/useSearch';
import { getExploreDestinations } from '../../db/repositories/FlightRepository';
import { formatPrice } from '../../utils/formatters';
import AirportAutocomplete from './AirportAutocomplete';
import type { ExploreDestination } from '../../agents/types';

export default function ExploreAnywhere() {
  const { exploreOrigin, setExploreOrigin } = useSearchStore();
  const { search } = useSearch();
  const [destinations, setDestinations] = useState<ExploreDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadDestinations = useCallback(async () => {
    setLoading(true);
    try {
      const results = await getExploreDestinations(
        exploreOrigin.length === 3 ? exploreOrigin : undefined,
      );
      setDestinations(results);
    } catch (err) {
      console.error('Failed to load explore destinations:', err);
      setDestinations([]);
    } finally {
      setLoading(false);
    }
  }, [exploreOrigin]);

  useEffect(() => {
    if (expanded) {
      loadDestinations();
    }
  }, [expanded, loadDestinations]);

  const handleSearchDestination = (dest: ExploreDestination) => {
    const origin = exploreOrigin || 'GRU';
    search(`Voo de ${origin} para ${dest.outboundDest}`);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5H10.5" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">Explorar destinos</span>
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
        <div className="px-4 pb-4 space-y-4">
          {/* Origin selector */}
          <div className="max-w-xs">
            <AirportAutocomplete
              label="Saindo de"
              value={exploreOrigin}
              onChange={setExploreOrigin}
              placeholder="Ex: GRU"
            />
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <span className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span className="ml-2 text-sm text-gray-500">Carregando destinos...</span>
            </div>
          )}

          {!loading && destinations.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">
                Nenhum dado historico encontrado.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Faca algumas buscas primeiro para descobrir os destinos mais baratos.
              </p>
            </div>
          )}

          {!loading && destinations.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {destinations.map((dest) => (
                <div
                  key={dest.outboundDest}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-800">
                      {dest.outboundDest}
                    </span>
                    <span className="text-xs text-gray-400">
                      {dest.flightCount} {dest.flightCount === 1 ? 'voo' : 'voos'}
                    </span>
                  </div>

                  <div className="text-lg font-semibold text-green-600 mb-2">
                    {formatPrice(dest.minPrice)}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {exploreOrigin || '???'} &rarr; {dest.outboundDest}
                    </span>
                    <button
                      onClick={() => handleSearchDestination(dest)}
                      className="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-700"
                    >
                      Buscar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
