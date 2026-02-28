import { useEffect, useState } from 'react';
import { getAllAlerts, deactivateAlert } from '../../db/repositories/AlertRepository';
import type { PriceAlert } from '../../agents/types';
import { formatPrice, formatRelativeTime } from '../../utils/formatters';
import EmptyState from '../shared/EmptyState';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllAlerts().then((a) => {
      setAlerts(a);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleDeactivate = async (id: string) => {
    await deactivateAlert(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: false } : a)));
  };

  if (loading) return <LoadingSpinner text="Carregando alertas..." />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">🔔 Alertas de Preço</h1>

      {alerts.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="Nenhum alerta ativo"
          description="Crie alertas de preço nos resultados de busca para ser notificado quando os preços caírem."
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-xl border p-4 ${
                alert.isActive ? 'border-blue-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Alerta: preço abaixo de{' '}
                    {formatPrice(alert.targetPrice, alert.currency)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Criado {formatRelativeTime(alert.createdAt)}
                    {alert.triggeredAt && ` — Disparado ${formatRelativeTime(alert.triggeredAt)}`}
                  </p>
                </div>
                {alert.isActive && (
                  <button
                    onClick={() => handleDeactivate(alert.id)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                  >
                    Desativar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
