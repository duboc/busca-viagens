import { useEffect } from 'react';
import { useSearchStore } from '../../stores/searchStore';
import { useAgentStore } from '../../stores/agentStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUIStore } from '../../stores/uiStore';
import { useSearch } from '../../hooks/useSearch';
import { getRecentSearches } from '../../db/repositories/SearchRepository';
import SearchBar from './SearchBar';
import QuickFilters from './QuickFilters';
import EmptyState from '../shared/EmptyState';
import { Link } from 'react-router-dom';

export default function SearchPage() {
  const { isRunning } = useAgentStore();
  const { geminiApiKey } = useSettingsStore();
  const { error, setError } = useUIStore();
  const { recentSearches, setRecentSearches } = useSearchStore();
  const { search, plan } = useSearch();

  useEffect(() => {
    getRecentSearches(5).then(setRecentSearches).catch(console.error);
  }, [setRecentSearches]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          ✈️ SkyAgent
        </h1>
        <p className="text-gray-500">
          Busca inteligente de passagens aéreas com IA
        </p>
      </div>

      {/* API key warning */}
      {!geminiApiKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-6 text-sm text-yellow-800">
          <span className="font-semibold">⚠️ API Key necessária.</span>{' '}
          <Link to="/settings" className="underline hover:text-yellow-900">
            Configure sua Gemini API key
          </Link>{' '}
          para começar a buscar.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Search bar */}
      <SearchBar onSearch={search} isSearching={isRunning} />

      {/* Quick filters (visible after plan is ready) */}
      <div className="mt-4">
        <QuickFilters plan={plan} />
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
                className="w-full text-left bg-white rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors text-sm"
              >
                <span className="text-gray-700">{s.rawInput}</span>
                <span className="text-gray-400 text-xs ml-2">
                  {s.parsedOrigin && s.parsedDest ? `${s.parsedOrigin} → ${s.parsedDest}` : ''}
                </span>
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
            description='Descreva sua viagem ideal em linguagem natural. Ex: "Quero ir para Paris em junho, saindo de São Paulo, até R$6000"'
          />
        </div>
      )}
    </div>
  );
}
