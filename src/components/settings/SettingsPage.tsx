import { useCallback, useEffect, useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useThemeStore } from '../../stores/themeStore';
import type { Theme } from '../../stores/themeStore';
import { getRecentSearches } from '../../db/repositories/SearchRepository';
import { getFlightsBySearch } from '../../db/repositories/FlightRepository';
import { getAgentLogsBySearch } from '../../db/repositories/AgentLogRepository';
import { getAllAlerts } from '../../db/repositories/AlertRepository';
import { downloadBlob } from '../../services/export';
import { getPermissionStatus, requestPermission, isSupported } from '../../services/notifications';
import {
  ENV_GEMINI_API_KEY,
  ENV_AMADEUS_CLIENT_ID,
  ENV_AMADEUS_CLIENT_SECRET,
  GEMINI_API_URL,
  GEMINI_MODEL,
} from '../../utils/constants';

const THEME_OPTIONS: { value: Theme; label: string; icon: string; description: string }[] = [
  { value: 'light', label: 'Claro', icon: '\u2600\uFE0F', description: 'Fundo claro com texto escuro' },
  { value: 'dark', label: 'Escuro', icon: '\uD83C\uDF19', description: 'Fundo escuro com texto claro' },
  { value: 'system', label: 'Sistema', icon: '\uD83D\uDCBB', description: 'Segue a preferencia do SO' },
];

function EnvBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded">
      .env
    </span>
  );
}

export default function SettingsPage() {
  const settings = useSettingsStore();
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [dbSize, setDbSize] = useState<string>('Calculando...');
  const [storageUsage, setStorageUsage] = useState<string>('Calculando...');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    getPermissionStatus(),
  );
  const [exportingAll, setExportingAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const hasEnvGemini = Boolean(ENV_GEMINI_API_KEY);
  const hasEnvAmadeus = Boolean(ENV_AMADEUS_CLIENT_ID && ENV_AMADEUS_CLIENT_SECRET);
  const effectiveKey = settings.effectiveGeminiKey();

  useEffect(() => {
    try {
      const dbData = localStorage.getItem('skyagent_db');
      setDbSize(dbData ? formatBytes(new Blob([dbData]).size) : '0 B');
    } catch {
      setDbSize('Indisponivel');
    }

    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) total += new Blob([key + value]).size;
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
    const key = effectiveKey;
    if (!key) {
      setTestResult('Insira uma API key primeiro.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${key}`,
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

  const currentResolved = resolvedTheme();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Configuracoes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">
          Gerencie suas chaves de API, preferencias e dados.
        </p>
      </div>

      <div className="space-y-5">
        {/* ── Theme ── */}
        <Section title="Aparencia" icon="\uD83C\uDFA8" description="Escolha o tema visual da aplicacao.">
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  theme === opt.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className="text-xl">{opt.icon}</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{opt.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-center">
            Tema ativo: <span className="font-medium">{currentResolved === 'dark' ? 'Escuro' : 'Claro'}</span>
          </p>
        </Section>

        {/* ── Gemini API Key ── */}
        <Section
          title="Gemini API Key"
          icon="\uD83D\uDD11"
          description="Necessaria para todas as funcionalidades de busca."
          badge={hasEnvGemini ? <EnvBadge /> : undefined}
        >
          {hasEnvGemini && (
            <div className="mb-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
              Chave carregada do arquivo <code className="font-mono bg-emerald-100 dark:bg-emerald-800/50 px-1 rounded">.env</code> (VITE_GEMINI_API_KEY). O campo abaixo pode sobrescrever.
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="password"
              value={settings.geminiApiKey}
              onChange={(e) => settings.setGeminiApiKey(e.target.value)}
              placeholder={hasEnvGemini ? 'Usando chave do .env' : 'AIzaSy...'}
              className="flex-1 px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <button
              onClick={testApiKey}
              disabled={testing || !effectiveKey}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? 'Testando...' : 'Testar'}
            </button>
          </div>
          {testResult && (
            <p className={`text-xs mt-2 ${testResult.includes('valida') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {testResult}
            </p>
          )}
        </Section>

        {/* ── Amadeus ── */}
        <Section
          title="Amadeus API"
          icon="\u2708\uFE0F"
          description="Para busca em APIs de voos oficiais. (Opcional)"
          badge={hasEnvAmadeus ? <EnvBadge /> : undefined}
        >
          {hasEnvAmadeus && (
            <div className="mb-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
              Credenciais carregadas do <code className="font-mono bg-emerald-100 dark:bg-emerald-800/50 px-1 rounded">.env</code>. Os campos abaixo podem sobrescrever.
            </div>
          )}
          <div className="space-y-2">
            <input
              type="password"
              value={settings.amadeusClientId}
              onChange={(e) => settings.setAmadeusCredentials(e.target.value, settings.amadeusClientSecret)}
              placeholder={hasEnvAmadeus ? 'Usando Client ID do .env' : 'Client ID'}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <input
              type="password"
              value={settings.amadeusClientSecret}
              onChange={(e) => settings.setAmadeusCredentials(settings.amadeusClientId, e.target.value)}
              placeholder={hasEnvAmadeus ? 'Usando Client Secret do .env' : 'Client Secret'}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
          <div className="mt-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Ambiente</label>
            <div className="flex gap-2">
              {(['test', 'production'] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => settings.setAmadeusEnv(env)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    settings.amadeusEnv === env
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {env === 'test' ? 'Teste' : 'Producao'}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Preferences ── */}
        <Section title="Preferencias de Viagem" icon="\uD83C\uDF0D">
          <div className="grid grid-cols-2 gap-4">
            <InputGroup label="Moeda">
              <select
                value={settings.currency}
                onChange={(e) => settings.setCurrency(e.target.value)}
                className="input-field"
              >
                <option value="BRL">BRL — Real</option>
                <option value="USD">USD — Dolar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — Libra</option>
              </select>
            </InputGroup>
            <InputGroup label="Classe preferida">
              <select
                value={settings.preferredCabin}
                onChange={(e) => settings.setPreferredCabin(e.target.value)}
                className="input-field"
              >
                <option value="economy">Economica</option>
                <option value="premium_economy">Premium Economy</option>
                <option value="business">Executiva</option>
                <option value="first">Primeira Classe</option>
              </select>
            </InputGroup>
            <InputGroup label="Max. paradas">
              <select
                value={settings.maxStops}
                onChange={(e) => settings.setMaxStops(Number(e.target.value))}
                className="input-field"
              >
                <option value={0}>Direto</option>
                <option value={1}>1 parada</option>
                <option value={2}>2 paradas</option>
                <option value={3}>3+ paradas</option>
              </select>
            </InputGroup>
            <InputGroup label="Verificar alertas (min)">
              <input
                type="number"
                min={5}
                max={120}
                value={settings.alertCheckInterval}
                onChange={(e) => settings.setAlertCheckInterval(Number(e.target.value))}
                className="input-field"
              />
            </InputGroup>
          </div>
        </Section>

        {/* ── Notifications ── */}
        <Section title="Notificacoes" icon="\uD83D\uDD14" description="Notificacoes do navegador para alertas de preco.">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                notifPermission === 'granted' ? 'bg-green-500' :
                notifPermission === 'denied' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {notifLabel[notifPermission] ?? notifPermission}
              </p>
            </div>
            {isSupported() && notifPermission !== 'granted' && notifPermission !== 'denied' && (
              <button
                onClick={handleRequestPermission}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Permitir
              </button>
            )}
          </div>
          {notifPermission === 'denied' && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-2">
              Bloqueadas pelo navegador. Altere nas configuracoes do navegador.
            </p>
          )}
        </Section>

        {/* ── Storage ── */}
        <Section title="Armazenamento" icon="\uD83D\uDCBE" description="Seus dados ficam 100% no seu dispositivo.">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Banco de dados (SQLite)</span>
              <span className="font-mono text-xs font-medium text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{dbSize}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Uso total do localStorage</span>
              <span className="font-mono text-xs font-medium text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{storageUsage}</span>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex flex-wrap gap-2">
              <button
                onClick={handleExportAll}
                disabled={exportingAll}
                className="px-4 py-2 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 transition-colors"
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
                className="px-4 py-2 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
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

/* ── Reusable sub-components ── */

function Section({
  title,
  icon,
  description,
  badge,
  children,
}: {
  title: string;
  icon?: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 transition-colors">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-base">{icon}</span>}
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
        {badge}
      </div>
      {description && <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 ml-6">{description}</p>}
      {!description && <div className="mt-3" />}
      <div className="ml-0">{children}</div>
    </div>
  );
}

function InputGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
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
