import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllAlerts, deactivateAlert } from '../../db/repositories/AlertRepository';
import { getSearch } from '../../db/repositories/SearchRepository';
import type { PriceAlert, Search } from '../../agents/types';
import { formatPrice, formatRelativeTime } from '../../utils/formatters';
import { requestPermission, getPermissionStatus, isSupported } from '../../services/notifications';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [searchMap, setSearchMap] = useState<Record<string, Search>>({});
  const [loading, setLoading] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    getPermissionStatus(),
  );
  const navigate = useNavigate();

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const allAlerts = await getAllAlerts();
      setAlerts(allAlerts);

      // Load associated searches
      const map: Record<string, Search> = {};
      for (const alert of allAlerts) {
        if (!map[alert.searchId]) {
          const search = await getSearch(alert.searchId);
          if (search) map[alert.searchId] = search;
        }
      }
      setSearchMap(map);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    await deactivateAlert(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: false } : a)));
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
  };

  const handleRerunSearch = (searchId: string) => {
    const search = searchMap[searchId];
    if (search) {
      navigate('/', { state: { rerunQuery: search.rawInput } });
    }
  };

  if (loading) return <LoadingSpinner text="Carregando alertas..." />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Alertas de Preco</h1>

        {/* Notification permission */}
        {isSupported() && notifPermission !== 'granted' && (
          <button
            onClick={handleRequestPermission}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Ativar Notificacoes
          </button>
        )}
        {isSupported() && notifPermission === 'granted' && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
            Notificacoes ativas
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="Nenhum alerta ativo"
          description="Alertas de preco monitoram suas buscas e notificam quando o preco cai abaixo do valor desejado. Para criar um alerta, faca uma busca e clique em 'Criar Alerta' nos resultados."
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const search = searchMap[alert.searchId];
            return (
              <div
                key={alert.id}
                className={`bg-white rounded-xl border p-4 ${
                  alert.isActive ? 'border-blue-200' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">
                      Alerta: preco abaixo de{' '}
                      {formatPrice(alert.targetPrice, alert.currency)}
                    </p>
                    {search && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {search.parsedOrigin ?? '?'} → {search.parsedDest ?? '?'}
                        {search.dateFrom ? ` | ${search.dateFrom}` : ''}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
                      <span>Criado {formatRelativeTime(alert.createdAt)}</span>
                      {alert.lastChecked && (
                        <span>Verificado {formatRelativeTime(alert.lastChecked)}</span>
                      )}
                      {alert.triggeredAt && (
                        <span className="text-green-600 font-medium">
                          Disparado {formatRelativeTime(alert.triggeredAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {alert.isActive && (
                      <>
                        <button
                          onClick={() => handleRerunSearch(alert.searchId)}
                          className="px-3 py-1.5 text-xs border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-50"
                        >
                          Re-buscar
                        </button>
                        <button
                          onClick={() => handleDeactivate(alert.id)}
                          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                        >
                          Desativar
                        </button>
                      </>
                    )}
                    {!alert.isActive && (
                      <span className="text-xs text-gray-400 italic">Inativo</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
