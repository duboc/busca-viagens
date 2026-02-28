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
  { text: 'Voo para Paris em junho saindo de GRU ate R$6000', icon: '\uD83C\uDDEB\uD83C\uDDF7' },
  { text: 'SP para Tokyo ida e volta em marco, classe executiva', icon: '\uD83C\uDDEF\uD83C\uDDF5' },
  { text: 'Passagem barata Rio para Lisboa proxima semana', icon: '\uD83C\uDDF5\uD83C\uDDF9' },
  { text: 'GRU para JFK direto em julho ate $800', icon: '\uD83C\uDDFA\uD83C\uDDF8' },
  { text: 'Familia de 4 para Orlando em janeiro', icon: '\uD83C\uDFE0' },
  { text: 'Mochilao pela Europa saindo de SP, orcamento R$3000', icon: '\uD83C\uDDEA\uD83C\uDDFA' },
];

const TRIP_MODE_OPTIONS: { key: TripMode; label: string; icon: string }[] = [
  { key: 'roundtrip', label: 'Ida e volta', icon: '\uD83D\uDD04' },
  { key: 'oneway', label: 'Somente ida', icon: '\u27A1\uFE0F' },
  { key: 'multi_city', label: 'Multi-cidades', icon: '\uD83D\uDDFA\uFE0F' },
];

export default function SearchPage() {
  const { isRunning } = useAgentStore();
  const { effectiveGeminiKey } = useSettingsStore();
  const geminiApiKey = effectiveGeminiKey();
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

  const planOrigin = plan?.intent.origins[0]?.iata ?? '';
  const planDest = plan?.intent.destinations[0]?.iata ?? '';
  const planBaseDate = plan?.intent.dateRanges[0]?.from ?? '';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-14">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl mb-4 shadow-lg shadow-blue-500/25">
          ✈️
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">
          SkyAgent
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-base transition-colors">
          Busca inteligente de passagens aereas com IA
        </p>
      </div>

      {/* API key warning */}
      {!geminiApiKey && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl px-4 py-3.5 mb-6 text-sm text-amber-800 dark:text-amber-300 transition-colors">
          <span className="text-lg shrink-0 mt-0.5">🔑</span>
          <div>
            <span className="font-semibold">API Key necessaria.</span>{' '}
            <Link to="/settings" className="underline decoration-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors">
              Configure sua Gemini API key
            </Link>{' '}
            ou adicione <code className="text-xs font-mono bg-amber-100 dark:bg-amber-800/40 px-1.5 py-0.5 rounded">VITE_GEMINI_API_KEY</code> ao <code className="text-xs font-mono bg-amber-100 dark:bg-amber-800/40 px-1.5 py-0.5 rounded">.env</code>.
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-2xl px-4 py-3.5 mb-6 text-sm text-red-700 dark:text-red-300 transition-colors">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:text-red-300 dark:hover:bg-red-800/40 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Trip mode toggle */}
      <div className="flex items-center justify-center gap-1 mb-5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 max-w-sm mx-auto transition-colors">
        {TRIP_MODE_OPTIONS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTripMode(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg font-medium transition-all ${
              tripMode === key
                ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span className="text-xs">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Multi-city builder */}
      {tripMode === 'multi_city' && (
        <div className="mb-5 space-y-3">
          <MultiCityBuilder />
          <div className="flex justify-center">
            <button
              onClick={handleMultiCitySearch}
              disabled={
                isRunning ||
                multiCityLegs.filter((l) => l.origin && l.destination && l.dateRange.from).length < 2
              }
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-600/25"
            >
              Buscar multi-cidades
            </button>
          </div>
        </div>
      )}

      {/* Search bar */}
      {tripMode !== 'multi_city' && (
        <SearchBar onSearch={search} isSearching={isRunning} />
      )}

      {/* Example suggestions */}
      {!isRunning && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {EXAMPLE_SEARCHES.slice(0, 4).map(({ text, icon }) => (
            <button
              key={text}
              onClick={() => handleExampleClick(text)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:border-blue-700 dark:hover:text-blue-300 transition-all shadow-sm"
            >
              <span>{icon}</span>
              <span>{text.length > 40 ? text.slice(0, 40) + '...' : text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Date picker toggle */}
      <div className="mt-5 flex justify-center">
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-xl transition-all ${
            showDatePicker
              ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm'
              : 'border-gray-200 hover:bg-gray-50 text-gray-500 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-400'
          }`}
        >
          📅
          {showDatePicker ? 'Esconder calendario' : 'Selecionar datas'}
        </button>
      </div>

      {showDatePicker && (
        <div className="mt-4">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      )}

      <div className="mt-4">
        <QuickFilters plan={plan} />
      </div>

      {planOrigin && planDest && (
        <div className="mt-4">
          <FlexDateMatrix origin={planOrigin} destination={planDest} baseDate={planBaseDate} />
        </div>
      )}

      <div className="mt-6">
        <ExploreAnywhere />
      </div>

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 transition-colors">
            Buscas Recentes
          </h2>
          <div className="space-y-2">
            {recentSearches.map((s) => (
              <button
                key={s.id}
                onClick={() => search(s.rawInput)}
                className="w-full text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 hover:border-blue-200 hover:bg-blue-50/50 dark:hover:border-blue-800 dark:hover:bg-blue-900/10 transition-all text-sm group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-gray-800 dark:text-gray-200 font-medium truncate block">{s.rawInput}</span>
                    {s.parsedOrigin && s.parsedDest && (
                      <span className="text-gray-400 dark:text-gray-500 text-xs mt-0.5 block">
                        {s.parsedOrigin} &rarr; {s.parsedDest}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
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

      {recentSearches.length === 0 && geminiApiKey && (
        <div className="mt-14">
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
