import { useCallback, useEffect, useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { getRecentSearches } from '../../db/repositories/SearchRepository';
import { getFlightsBySearch } from '../../db/repositories/FlightRepository';
import { getAgentLogsBySearch } from '../../db/repositories/AgentLogRepository';
import { getAllAlerts } from '../../db/repositories/AlertRepository';
import { downloadBlob } from '../../services/export';
import { getPermissionStatus, requestPermission, isSupported } from '../../services/notifications';

export default function SettingsPage() {
  const settings = useSettingsStore();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [dbSize, setDbSize] = useState<string>('Calculando...');
  const [storageUsage, setStorageUsage] = useState<string>('Calculando...');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    getPermissionStatus(),
  );
  const [exportingAll, setExportingAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    // Calculate database size from localStorage
    try {
      const dbData = localStorage.getItem('skyagent_db');
      if (dbData) {
        const bytes = new Blob([dbData]).size;
        setDbSize(formatBytes(bytes));
      } else {
        setDbSize('0 B');
      }
    } catch {
      setDbSize('Indisponivel');
    }

    // Calculate total storage usage
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            total += new Blob([key + value]).size;
          }
        }
      }
      setStorageUsage(formatBytes(total));
    } catch {
      setStorageUsage('Indisponivel');
    }
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const testApiKey = async () => {
    if (!settings.geminiApiKey) {
      setTestResult('Insira uma API key primeiro.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Responda apenas "ok"' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        },
      );
      if (res.ok) {
        setTestResult('API key valida!');
      } else {
        const err = await res.text();
        setTestResult(`Erro: ${res.status} — ${err.slice(0, 100)}`);
      }
    } catch (err) {
      setTestResult(`Erro de conexao: ${(err as Error).message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const searches = await getRecentSearches(1000);
      const alerts = await getAllAlerts();

      const searchesWithData = [];
      for (const search of searches) {
        const flights = await getFlightsBySearch(search.id);
        const logs = await getAgentLogsBySearch(search.id);
        searchesWithData.push({ search, flights, logs });
      }

      const payload = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        settings: {
          currency: settings.currency,
          preferredCabin: settings.preferredCabin,
          maxStops: settings.maxStops,
          alertCheckInterval: settings.alertCheckInterval,
        },
        searches: searchesWithData,
        alerts,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8;',
      });
      downloadBlob(blob, `skyagent_full_export_${new Date().toISOString().slice(0, 10)}.json`);
      showToast('Dados exportados com sucesso!');
    } catch {
      showToast('Erro ao exportar dados.');
    } finally {
      setExportingAll(false);
    }
  };

  const notifLabel: Record<string, string> = {
    granted: 'Permitidas',
    denied: 'Bloqueadas',
    default: 'Nao solicitadas',
    unsupported: 'Nao suportadas',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-900 mb-6">Configuracoes</h1>

      <div className="space-y-6">
        {/* Gemini API Key */}
        <Section title="Gemini API Key" description="Necessaria para todas as funcionalidades de busca.">
          <div className="flex gap-2">
            <input
              type="password"
              value={settings.geminiApiKey}
              onChange={(e) => settings.setGeminiApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={testApiKey}
              disabled={testing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {testing ? 'Testando...' : 'Testar'}
            </button>
          </div>
          {testResult && (
            <p className={`text-xs mt-1 ${testResult.includes('valida') ? 'text-green-600' : 'text-red-600'}`}>
              {testResult}
            </p>
          )}
        </Section>

        {/* Amadeus */}
        <Section title="Amadeus API (Opcional)" description="Para busca em APIs de voos oficiais.">
          <input
            type="password"
            value={settings.amadeusClientId}
            onChange={(e) => settings.setAmadeusCredentials(e.target.value, settings.amadeusClientSecret)}
            placeholder="Client ID"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={settings.amadeusClientSecret}
            onChange={(e) => settings.setAmadeusCredentials(settings.amadeusClientId, e.target.value)}
            placeholder="Client Secret"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Section>

        {/* Preferences */}
        <Section title="Preferencias de Viagem">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Moeda</label>
              <select
                value={settings.currency}
                onChange={(e) => settings.setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BRL">BRL — Real</option>
                <option value="USD">USD — Dolar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Classe preferida</label>
              <select
                value={settings.preferredCabin}
                onChange={(e) => settings.setPreferredCabin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="economy">Economica</option>
                <option value="premium_economy">Premium Economy</option>
                <option value="business">Executiva</option>
                <option value="first">Primeira Classe</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max. paradas</label>
              <select
                value={settings.maxStops}
                onChange={(e) => settings.setMaxStops(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Direto</option>
                <option value={1}>1 parada</option>
                <option value={2}>2 paradas</option>
                <option value={3}>3+ paradas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Verificar alertas (min)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={settings.alertCheckInterval}
                onChange={(e) => settings.setAlertCheckInterval(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notificacoes" description="Permissao para notificacoes do navegador para alertas de preco.">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Status: <span className="font-medium">{notifLabel[notifPermission] ?? notifPermission}</span>
              </p>
            </div>
            {isSupported() && notifPermission !== 'granted' && notifPermission !== 'denied' && (
              <button
                onClick={handleRequestPermission}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Permitir Notificacoes
              </button>
            )}
            {notifPermission === 'denied' && (
              <p className="text-xs text-red-500">
                Notificacoes bloqueadas. Altere nas configuracoes do navegador.
              </p>
            )}
          </div>
        </Section>

        {/* Storage & Data */}
        <Section title="Armazenamento" description="Seus dados ficam 100% no seu dispositivo.">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Banco de dados (SQLite)</span>
              <span className="font-medium text-gray-900">{dbSize}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Uso total do localStorage</span>
              <span className="font-medium text-gray-900">{storageUsage}</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-2">
              <button
                onClick={handleExportAll}
                disabled={exportingAll}
                className="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm hover:bg-blue-50 disabled:opacity-50"
              >
                {exportingAll ? 'Exportando...' : 'Exportar Todos os Dados'}
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Tem certeza? Todos os dados serao apagados permanentemente.')) {
                    localStorage.removeItem('skyagent_db');
                    localStorage.removeItem('skyagent-settings');
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
              >
                Limpar Todos os Dados
              </button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {description && <p className="text-xs text-gray-400 mt-0.5 mb-3">{description}</p>}
      {!description && <div className="mt-3" />}
      {children}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
