import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

export default function SettingsPage() {
  const settings = useSettingsStore();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

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
        setTestResult('API key válida!');
      } else {
        const err = await res.text();
        setTestResult(`Erro: ${res.status} — ${err.slice(0, 100)}`);
      }
    } catch (err) {
      setTestResult(`Erro de conexão: ${(err as Error).message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">⚙️ Configurações</h1>

      <div className="space-y-6">
        {/* Gemini API Key */}
        <Section title="Gemini API Key" description="Necessária para todas as funcionalidades de busca.">
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
            <p className={`text-xs mt-1 ${testResult.includes('válida') ? 'text-green-600' : 'text-red-600'}`}>
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
        <Section title="Preferências de Viagem">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Moeda</label>
              <select
                value={settings.currency}
                onChange={(e) => settings.setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BRL">BRL — Real</option>
                <option value="USD">USD — Dólar</option>
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
                <option value="economy">Econômica</option>
                <option value="premium_economy">Premium Economy</option>
                <option value="business">Executiva</option>
                <option value="first">Primeira Classe</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Máx. paradas</label>
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

        {/* Data */}
        <Section title="Dados" description="Seus dados ficam 100% no seu dispositivo.">
          <button
            onClick={() => {
              localStorage.removeItem('skyagent_db');
              localStorage.removeItem('skyagent-settings');
              window.location.reload();
            }}
            className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
          >
            Limpar Todos os Dados
          </button>
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
