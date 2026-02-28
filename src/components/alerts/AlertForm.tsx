import { useState } from 'react';
import { createAlert, deactivateAlert } from '../../db/repositories/AlertRepository';
import { formatPrice } from '../../utils/formatters';

interface AlertFormProps {
  searchId: string;
  currentMinPrice: number;
  currency: string;
  onCreated: () => void;
}

export default function AlertForm({ searchId, currentMinPrice, currency, onCreated }: AlertFormProps) {
  const [targetPrice, setTargetPrice] = useState<string>(
    Math.round(currentMinPrice * 0.9).toString(),
  );
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = Number(targetPrice);
    if (!price || price <= 0) {
      setError('Insira um preço válido.');
      return;
    }

    setSaving(true);
    try {
      const alert = await createAlert(searchId, price, currency);
      // If the user toggled to inactive, we leave it as-is for now
      // (createAlert always creates active; deactivation is handled separately)
      if (!isActive) {
        await deactivateAlert(alert.id);
      }
      onCreated();
    } catch {
      setError('Erro ao criar alerta. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-blue-200 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Criar Alerta de Preco</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Menor preco atual: {formatPrice(currentMinPrice, currency)}
        </p>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Preco alvo ({currency})
        </label>
        <input
          type="number"
          min={1}
          step={1}
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          placeholder="Ex: 1500"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            isActive ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
              isActive ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
        <span className="text-xs text-gray-600">
          {isActive ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Criando...' : 'Criar Alerta'}
      </button>
    </form>
  );
}
