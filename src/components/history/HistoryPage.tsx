import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecentSearches } from '../../db/repositories/SearchRepository';
import type { Search } from '../../agents/types';
import { formatRelativeTime } from '../../utils/formatters';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function HistoryPage() {
  const [searches, setSearches] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentSearches(50).then((s) => {
      setSearches(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Carregando histórico..." />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">📊 Histórico de Buscas</h1>

      {searches.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Nenhuma busca realizada"
          description="Suas buscas aparecerão aqui após você fazer a primeira."
          action={
            <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Fazer Primeira Busca
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {searches.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{s.rawInput}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {s.parsedOrigin && s.parsedDest && (
                      <span>{s.parsedOrigin} → {s.parsedDest}</span>
                    )}
                    {s.dateFrom && <span>{s.dateFrom}</span>}
                    <span>{formatRelativeTime(s.createdAt)}</span>
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
            </div>
          ))}
        </div>
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
  };
  const labels: Record<string, string> = {
    completed: 'Concluída',
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
