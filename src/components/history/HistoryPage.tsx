import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecentSearches } from '../../db/repositories/SearchRepository';
import { getFlightsBySearch } from '../../db/repositories/FlightRepository';
import { getAgentLogsBySearch } from '../../db/repositories/AgentLogRepository';
import type { Search } from '../../agents/types';
import { formatRelativeTime } from '../../utils/formatters';
import { exportCSV, exportJSON, downloadBlob } from '../../services/export';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function HistoryPage() {
  const [searches, setSearches] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    getRecentSearches(50).then((s) => {
      setSearches(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleExportSearch = useCallback(async (search: Search) => {
    setExporting(search.id);
    try {
      const flights = await getFlightsBySearch(search.id);
      const logs = await getAgentLogsBySearch(search.id);
      if (flights.length === 0) {
        showToast('Nenhum voo encontrado para exportar.');
        return;
      }
      const blob = exportJSON(flights, search, logs);
      const filename = `skyagent_${search.parsedOrigin ?? 'search'}_${search.parsedDest ?? ''}_${search.createdAt.slice(0, 10)}.json`;
      downloadBlob(blob, filename);
      showToast('Busca exportada com sucesso!');
    } catch {
      showToast('Erro ao exportar busca.');
    } finally {
      setExporting(null);
    }
  }, [showToast]);

  const handleBulkExport = useCallback(async () => {
    setExporting('bulk');
    try {
      const allData: Array<{
        search: Search;
        flights: Awaited<ReturnType<typeof getFlightsBySearch>>;
        logs: Awaited<ReturnType<typeof getAgentLogsBySearch>>;
      }> = [];

      for (const search of searches) {
        const flights = await getFlightsBySearch(search.id);
        const logs = await getAgentLogsBySearch(search.id);
        allData.push({ search, flights, logs });
      }

      const payload = {
        exportedAt: new Date().toISOString(),
        totalSearches: allData.length,
        searches: allData,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8;',
      });
      const filename = `skyagent_all_searches_${new Date().toISOString().slice(0, 10)}.json`;
      downloadBlob(blob, filename);
      showToast(`${allData.length} buscas exportadas!`);
    } catch {
      showToast('Erro ao exportar buscas.');
    } finally {
      setExporting(null);
    }
  }, [searches, showToast]);

  if (loading) return <LoadingSpinner text="Carregando historico..." />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Historico de Buscas</h1>
        {searches.length > 0 && (
          <button
            onClick={handleBulkExport}
            disabled={exporting === 'bulk'}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting === 'bulk' ? 'Exportando...' : 'Exportar Tudo'}
          </button>
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
        <div className="space-y-3">
          {searches.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{s.rawInput}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {s.parsedOrigin && s.parsedDest && (
                      <span>{s.parsedOrigin} &rarr; {s.parsedDest}</span>
                    )}
                    {s.dateFrom && <span>{s.dateFrom}</span>}
                    <span>{formatRelativeTime(s.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {s.status === 'completed' && (
                    <button
                      onClick={() => handleExportSearch(s)}
                      disabled={exporting === s.id}
                      className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {exporting === s.id ? '...' : 'Exportar'}
                    </button>
                  )}
                  <StatusBadge status={s.status} />
                </div>
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
