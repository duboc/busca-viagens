import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTripStore } from '../../stores/tripStore';
import { formatPrice } from '../../utils/formatters';
import * as TripRepo from '../../db/repositories/TripRepository';
import type { Trip } from '../../agents/types';

type SortOption = 'newest' | 'upcoming' | 'alphabetical';

const STATUS_CONFIG: Record<Trip['status'], { label: string; color: string }> = {
  planning: {
    label: 'Planejando',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  },
  booked: {
    label: 'Reservado',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  completed: {
    label: 'Concluida',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  },
  cancelled: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
};

const EMOJI_OPTIONS = ['✈️', '🏖️', '🏔️', '🌍', '🗼', '🎢', '🚢', '🏕️', '🌴', '🎌'];

export default function TripsPage() {
  const { trips, loading, loadTrips, createTrip } = useTripStore();
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showForm, setShowForm] = useState(false);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [totalCosts, setTotalCosts] = useState<Record<string, number>>({});

  // New trip form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEmoji, setNewEmoji] = useState('✈️');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newBudget, setNewBudget] = useState('');

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  useEffect(() => {
    async function fetchMeta() {
      const counts: Record<string, number> = {};
      const costs: Record<string, number> = {};
      for (const trip of trips) {
        counts[trip.id] = await TripRepo.getTripItemCount(trip.id);
        costs[trip.id] = await TripRepo.getTripTotalCost(trip.id);
      }
      setItemCounts(counts);
      setTotalCosts(costs);
    }
    if (trips.length > 0) {
      fetchMeta();
    }
  }, [trips]);

  const sortedTrips = [...trips].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.updatedAt.localeCompare(a.updatedAt);
      case 'upcoming':
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return a.startDate.localeCompare(b.startDate);
      case 'alphabetical':
        return a.name.localeCompare(b.name, 'pt-BR');
      default:
        return 0;
    }
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createTrip(
      newName.trim(),
      newDescription.trim() || undefined,
      newEmoji,
      newStartDate || undefined,
      newEndDate || undefined,
      newBudget ? parseFloat(newBudget) : undefined,
    );
    setNewName('');
    setNewDescription('');
    setNewEmoji('✈️');
    setNewStartDate('');
    setNewEndDate('');
    setNewBudget('');
    setShowForm(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">
            Minhas Viagens
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Planeje e organize seus roteiros de viagem
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          Nova Viagem
        </button>
      </div>

      {/* New Trip Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6 transition-colors">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Criar Nova Viagem
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Emoji selector */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Icone
              </label>
              <div className="flex gap-2 flex-wrap">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewEmoji(emoji)}
                    className={`w-10 h-10 text-xl rounded-lg border-2 transition-colors flex items-center justify-center ${
                      newEmoji === emoji
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome da viagem *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Ferias em Lisboa"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descricao
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Descreva sua viagem..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Start date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data de inicio
              </label>
              <input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* End date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data de fim
              </label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Orcamento (R$)
              </label>
              <input
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                placeholder="0"
                min="0"
                step="100"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Criar Viagem
            </button>
          </div>
        </div>
      )}

      {/* Sort bar */}
      {trips.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">Ordenar por:</span>
          {([
            { value: 'newest', label: 'Mais recentes' },
            { value: 'upcoming', label: 'Proximas' },
            { value: 'alphabetical', label: 'A-Z' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                sortBy === opt.value
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Carregando viagens...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && trips.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Nenhuma viagem ainda
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Comece criando sua primeira viagem para organizar voos, hoteis, atividades e muito mais.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Criar Primeira Viagem
          </button>
        </div>
      )}

      {/* Trip cards grid */}
      {!loading && trips.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTrips.map((trip) => {
            const count = itemCounts[trip.id] ?? 0;
            const cost = totalCosts[trip.id] ?? 0;
            const statusCfg = STATUS_CONFIG[trip.status];

            return (
              <Link
                key={trip.id}
                to={`/trips/${trip.id}`}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md dark:hover:shadow-black/20 transition-all group"
              >
                {/* Emoji + status */}
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{trip.coverEmoji}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Name */}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1 truncate">
                  {trip.name}
                </h3>

                {/* Dates */}
                {(trip.startDate || trip.endDate) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {trip.startDate?.slice(0, 10) ?? '...'} - {trip.endDate?.slice(0, 10) ?? '...'}
                  </p>
                )}

                {/* Description */}
                {trip.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {trip.description}
                  </p>
                )}

                {/* Footer: cost + items */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatPrice(cost, trip.currency)}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {count} {count === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                {/* Budget bar */}
                {trip.totalBudget && trip.totalBudget > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          cost > trip.totalBudget
                            ? 'bg-red-500'
                            : cost > trip.totalBudget * 0.8
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, (cost / trip.totalBudget) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatPrice(cost, trip.currency)} / {formatPrice(trip.totalBudget, trip.currency)}
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
