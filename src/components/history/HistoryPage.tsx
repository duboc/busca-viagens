import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getRecentSearches } from '../../db/repositories/SearchRepository';
import { getDatabase, saveDatabase } from '../../db/database';
import type { Search } from '../../agents/types';
import { formatRelativeTime } from '../../utils/formatters';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';
import PriceTrendChart from './PriceTrendChart';

export default function HistoryPage() {
  const [searches, setSearches] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSearches = useCallback(() => {
    getRecentSearches(50).then((s) => {
      setSearches(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSearches();
  }, [loadSearches]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const db = await getDatabase();
      db.run('DELETE FROM searches WHERE id = ?', [id]);
      saveDatabase();
      setSearches((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // Silently handle error
    } finally {
      setDeletingId(null);
    }
  }, []);

  if (loading) return <LoadingSpinner text="Carregando historico..." />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Historico de Buscas</h1>
        {searches.length > 0 && (
          <span className="text-sm text-gray-400">
            {searches.length} {searches.length === 1 ? 'busca' : 'buscas'}
          </span>
        )}
      </div>

      {searches.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Nenhuma busca realizada"
          description="Suas buscas aparecerao aqui apos voce fazer a primeira."
          action={
            <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Fazer Primeira Busca
            </Link>
          }
        />
      ) : (
        <>
          {/* Price trend chart when there are multiple searches */}
          {searches.length >= 2 && (
            <div className="mb-6">
              <PriceTrendChart searches={searches} />
            </div>
          )}

          {/* Search cards */}
          <div className="space-y-3">
            {searches.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{s.rawInput}</p>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {s.parsedOrigin && s.parsedDest && (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          <PlaneIcon />
                          {s.parsedOrigin} &rarr; {s.parsedDest}
                        </span>
                      )}
                      {s.dateFrom && (
                        <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full">
                          {s.dateFrom}
                          {s.dateTo && s.dateTo !== s.dateFrom && ` - ${s.dateTo}`}
                        </span>
                      )}
                      {s.tripType !== 'roundtrip' && (
                        <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                          {s.tripType === 'oneway' ? 'Somente ida' : 'Multi-cidades'}
                        </span>
                      )}
                      {s.maxBudget && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          Ate {s.currency} {s.maxBudget.toLocaleString()}
                        </span>
                      )}
                      {s.passengers > 1 && (
                        <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full">
                          {s.passengers} passageiros
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 mt-2">
                      {formatRelativeTime(s.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={s.status} />

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Excluir busca"
                    >
                      {deletingId === s.id ? (
                        <span className="block w-4 h-4 animate-spin rounded-full border-2 border-gray-200 border-t-red-400" />
                      ) : (
                        <TrashIcon />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-600',
    searching: 'bg-blue-100 text-blue-700',
    planning: 'bg-blue-100 text-blue-700',
    parsing: 'bg-blue-100 text-blue-700',
    ranking: 'bg-blue-100 text-blue-700',
  };
  const labels: Record<string, string> = {
    completed: 'Concluida',
    failed: 'Falhou',
    pending: 'Pendente',
    planning: 'Planejando',
    searching: 'Buscando',
    parsing: 'Processando',
    ranking: 'Rankeando',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? styles.pending}`}>
      {labels[status] ?? status}
    </span>
  );
}

function PlaneIcon() {
  return (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
