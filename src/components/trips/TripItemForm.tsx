import { useState, useEffect } from 'react';
import type { TripItem } from '../../agents/types';

type ItemType = TripItem['itemType'];

interface TripItemFormProps {
  initialData?: TripItem;
  defaultType?: ItemType;
  onSave: (data: Omit<TripItem, 'id' | 'tripId' | 'createdAt'>) => void;
  onCancel: () => void;
}

const TYPE_CONFIG: Record<ItemType, { icon: string; label: string }> = {
  flight: { icon: '✈️', label: 'Voo' },
  hotel: { icon: '🏨', label: 'Hotel' },
  activity: { icon: '🎯', label: 'Atividade' },
  transport: { icon: '🚗', label: 'Transporte' },
  note: { icon: '📝', label: 'Nota' },
};

export default function TripItemForm({ initialData, defaultType, onSave, onCancel }: TripItemFormProps) {
  const [itemType, setItemType] = useState<ItemType>(initialData?.itemType ?? defaultType ?? 'activity');
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [dateStart, setDateStart] = useState(initialData?.dateStart?.slice(0, 16) ?? '');
  const [dateEnd, setDateEnd] = useState(initialData?.dateEnd?.slice(0, 16) ?? '');
  const [location, setLocation] = useState(initialData?.location ?? '');
  const [cost, setCost] = useState(initialData?.cost?.toString() ?? '0');
  const [currency, setCurrency] = useState(initialData?.currency ?? 'BRL');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [bookingUrl, setBookingUrl] = useState(initialData?.bookingUrl ?? '');

  // Update type when defaultType changes (e.g. from dropdown menu)
  useEffect(() => {
    if (defaultType && !initialData) {
      setItemType(defaultType);
    }
  }, [defaultType, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      itemType,
      title: title.trim(),
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
      location: location.trim() || undefined,
      cost: parseFloat(cost) || 0,
      currency,
      notes: notes.trim() || undefined,
      bookingUrl: bookingUrl.trim() || undefined,
      flightId: initialData?.flightId,
      sortOrder: initialData?.sortOrder ?? 0,
    });
  };

  const isEditing = !!initialData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto transition-colors">
        <div className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {isEditing ? 'Editar Item' : 'Adicionar Item'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Item type selector */}
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(TYPE_CONFIG) as [ItemType, { icon: string; label: string }][]).map(
                    ([type, cfg]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setItemType(type)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                          itemType === type
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-2 ring-blue-500'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <span>{cfg.icon}</span>
                        {cfg.label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Titulo *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  itemType === 'flight'
                    ? 'Ex: Voo LATAM GRU-LIS'
                    : itemType === 'hotel'
                      ? 'Ex: Hotel da Praia'
                      : itemType === 'activity'
                        ? 'Ex: Visita ao Castelo'
                        : itemType === 'transport'
                          ? 'Ex: Transfer aeroporto'
                          : 'Ex: Lembrar de levar passaporte'
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>

            {/* Linked flight info */}
            {initialData?.flightId && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <span>✈️</span>
                  Voo vinculado: {initialData.flightId.slice(0, 8)}...
                </p>
              </div>
            )}

            {/* Location (prominent for hotel/activity) */}
            {itemType !== 'note' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {itemType === 'hotel' ? 'Hotel / Endereco' : 'Local'}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={
                    itemType === 'hotel'
                      ? 'Nome do hotel ou endereco'
                      : 'Local da atividade'
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {itemType === 'hotel' ? 'Check-in' : 'Inicio'}
                </label>
                <input
                  type="datetime-local"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {itemType === 'hotel' ? 'Check-out' : 'Fim'}
                </label>
                <input
                  type="datetime-local"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            {/* Cost + Currency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Custo
                </label>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Moeda
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notas
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observacoes adicionais..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Booking URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link de reserva
              </label>
              <input
                type="url"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isEditing ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
