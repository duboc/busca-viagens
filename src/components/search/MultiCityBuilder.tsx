import { useCallback } from 'react';
import { useSearchStore } from '../../stores/searchStore';
import type { MultiCityLeg } from '../../agents/types';
import AirportAutocomplete from './AirportAutocomplete';

export default function MultiCityBuilder() {
  const { multiCityLegs, setMultiCityLegs } = useSearchStore();

  const updateLeg = useCallback(
    (index: number, field: keyof MultiCityLeg | 'date', value: string) => {
      const updated = multiCityLegs.map((leg, i) => {
        if (i !== index) return leg;
        if (field === 'origin' || field === 'destination') {
          return { ...leg, [field]: value };
        }
        if (field === 'date') {
          return { ...leg, dateRange: { ...leg.dateRange, from: value, to: value } };
        }
        return leg;
      });
      setMultiCityLegs(updated);
    },
    [multiCityLegs, setMultiCityLegs],
  );

  const addLeg = useCallback(() => {
    const lastLeg = multiCityLegs[multiCityLegs.length - 1];
    setMultiCityLegs([
      ...multiCityLegs,
      {
        origin: lastLeg?.destination ?? '',
        destination: '',
        dateRange: { from: '', to: '' },
      },
    ]);
  }, [multiCityLegs, setMultiCityLegs]);

  const removeLeg = useCallback(
    (index: number) => {
      if (multiCityLegs.length <= 2) return;
      setMultiCityLegs(multiCityLegs.filter((_, i) => i !== index));
    },
    [multiCityLegs, setMultiCityLegs],
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Trechos da viagem</h3>

      {multiCityLegs.map((leg, index) => (
        <div
          key={index}
          className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg"
        >
          <span className="text-xs font-medium text-gray-400 pb-2 min-w-[24px]">
            {index + 1}.
          </span>

          <div className="flex-1 min-w-0">
            <AirportAutocomplete
              label="Origem"
              value={leg.origin}
              onChange={(iata) => updateLeg(index, 'origin', iata)}
              placeholder="Ex: GRU"
            />
          </div>

          <div className="flex items-center pb-2 text-gray-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <AirportAutocomplete
              label="Destino"
              value={leg.destination}
              onChange={(iata) => updateLeg(index, 'destination', iata)}
              placeholder="Ex: CDG"
            />
          </div>

          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
            <input
              type="date"
              value={leg.dateRange.from}
              onChange={(e) => updateLeg(index, 'date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => removeLeg(index)}
            disabled={multiCityLegs.length <= 2}
            className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Remover trecho"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={addLeg}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Adicionar trecho
        </button>

        <span className="text-xs text-gray-400">
          {multiCityLegs.length} {multiCityLegs.length === 1 ? 'trecho' : 'trechos'}
        </span>
      </div>
    </div>
  );
}
