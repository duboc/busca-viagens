import { useEffect, useState } from 'react';
import { useSearchStore, type TripMode } from '../../stores/searchStore';
import { useAgentStore } from '../../stores/agentStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUIStore } from '../../stores/uiStore';
import { useSearch } from '../../hooks/useSearch';
import { getRecentSearches } from '../../db/repositories/SearchRepository';
import SearchBar from './SearchBar';
import QuickFilters from './QuickFilters';
import DateRangePicker from './DateRangePicker';
import MultiCityBuilder from './MultiCityBuilder';
import ExploreAnywhere from './ExploreAnywhere';
import FlexDateMatrix from './FlexDateMatrix';
import EmptyState from '../shared/EmptyState';
import { Link } from 'react-router-dom';

const EXAMPLE_SEARCHES = [
  'Voo para Paris em junho saindo de GRU ate R$6000',
  'SP para Tokyo ida e volta em marco, classe executiva',
  'Passagem barata Rio para Lisboa proxima semana',
  'GRU para JFK direto em julho ate $800',
  'Familia de 4 para Orlando em janeiro',
  'Mochilao pela Europa saindo de SP, orcamento R$3000',
];

const TRIP_MODE_OPTIONS: { key: TripMode; label: string }[] = [
  { key: 'roundtrip', label: 'Ida e volta' },
  { key: 'oneway', label: 'Somente ida' },
  { key: 'multi_city', label: 'Multi-cidades' },
];

export default function SearchPage() {
  const { isRunning } = useAgentStore();
  const { geminiApiKey } = useSettingsStore();
  const { error, setError } = useUIStore();
  const { recentSearches, setRecentSearches, tripMode, setTripMode, multiCityLegs } = useSearchStore();
  const { search, plan } = useSearch();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    getRecentSearches(5).then(setRecentSearches).catch(console.error);
  }, [setRecentSearches]);

  const handleExampleClick = (example: string) => {
    search(example);
  };

  const handleMultiCitySearch = () => {
    const validLegs = multiCityLegs.filter(
      (leg) => leg.origin && leg.destination && leg.dateRange.from,
    );
    if (validLegs.length < 2) return;
    const description = validLegs
      .map((leg) => `${leg.origin} para ${leg.destination} em ${leg.dateRange.from}`)
      .join(', depois ');
    search(`Multi-cidades: ${description}`);
  };

  // Derive origin/destination from the plan for the FlexDateMatrix
  const planOrigin = plan?.intent.origins[0]?.iata ?? '';
  const planDest = plan?.intent.destinations[0]?.iata ?? '';
  const planBaseDate = plan?.intent.dateRanges[0]?.from ?? '';

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          SkyAgent
        </h1>
        <p className="text-gray-500">
          Busca inteligente de passagens aereas com IA
        </p>
      </div>

      {/* API key warning */}
      {!geminiApiKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-6 text-sm text-yellow-800">
          <span className="font-semibold">API Key necessaria.</span>{' '}
          <Link to="/settings" className="underline hover:text-yellow-900">
            Configure sua Gemini API key
          </Link>{' '}
          para comecar a buscar.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Trip mode toggle */}
      <div className="flex items-center justify-center gap-1 mb-4">
        {TRIP_MODE_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTripMode(key)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              tripMode === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Multi-city builder */}
      {tripMode === 'multi_city' && (
        <div className="mb-4 space-y-3">
          <MultiCityBuilder />
          <div className="flex justify-center">
            <button
              onClick={handleMultiCitySearch}
              disabled={
                isRunning ||
                multiCityLegs.filter((l) => l.origin && l.destination && l.dateRange.from).length < 2
              }
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Buscar multi-cidades
            </button>
          </div>
        </div>
      )}

      {/* Search bar (shown for roundtrip and oneway) */}
      {tripMode !== 'multi_city' && (
        <SearchBar onSearch={search} isSearching={isRunning} />
      )}

      {/* Example search suggestions */}
      {!isRunning && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {EXAMPLE_SEARCHES.slice(0, 4).map((example) => (
            <button
              key={example}
              onClick={() => handleExampleClick(example)}
              className="px-3 py-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
            >
              {example.length > 45 ? example.slice(0, 45) + '...' : example}
            </button>
          ))}
        </div>
      )}

      {/* Date picker toggle */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
            showDatePicker
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:bg-gray-50 text-gray-500'
          }`}
        >
          {showDatePicker ? 'Esconder calendario' : 'Selecionar datas manualmente'}
        </button>
      </div>

      {/* DateRangePicker */}
      {showDatePicker && (
        <div className="mt-4">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      )}

      {/* Quick filters (visible after plan is ready) */}
      <div className="mt-4">
        <QuickFilters plan={plan} />
      </div>

      {/* Flexible date matrix (only when origin+dest are known) */}
      {planOrigin && planDest && (
        <div className="mt-4">
          <FlexDateMatrix
            origin={planOrigin}
            destination={planDest}
            baseDate={planBaseDate}
          />
        </div>
      )}

      {/* Explore Anywhere */}
      <div className="mt-4">
        <ExploreAnywhere />
      </div>

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <div className="mt-12">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">Buscas Recentes</h2>
          <div className="space-y-2">
            {recentSearches.map((s) => (
              <button
                key={s.id}
                onClick={() => search(s.rawInput)}
                className="w-full text-left bg-white rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors text-sm group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-700">{s.rawInput}</span>
                    <span className="text-gray-400 text-xs ml-2">
                      {s.parsedOrigin && s.parsedDest ? `${s.parsedOrigin} \u2192 ${s.parsedDest}` : ''}
                    </span>
                  </div>
                  <span className="text-gray-300 group-hover:text-blue-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no recent searches */}
      {recentSearches.length === 0 && geminiApiKey && (
        <div className="mt-12">
          <EmptyState
            icon="🌍"
            title="Pronto para explorar?"
            description='Descreva sua viagem ideal em linguagem natural. Ex: "Quero ir para Paris em junho, saindo de Sao Paulo, ate R$6000"'
          />
        </div>
      )}
    </div>
  );
}
