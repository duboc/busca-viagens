import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTripStore } from '../../stores/tripStore';
import { formatPrice } from '../../utils/formatters';
import { exportTripAsText, shareTripUrl } from '../../services/tripExport';
import TripItemForm from './TripItemForm';
import type { Trip, TripItem } from '../../agents/types';

type ItemType = TripItem['itemType'];

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

const TYPE_ICONS: Record<ItemType, string> = {
  flight: '✈️',
  hotel: '🏨',
  activity: '🎯',
  transport: '🚗',
  note: '📝',
};

const TYPE_LABELS: Record<ItemType, string> = {
  flight: 'Voo',
  hotel: 'Hotel',
  activity: 'Atividade',
  transport: 'Transporte',
  note: 'Nota',
};

const ITEM_TYPES: ItemType[] = ['flight', 'hotel', 'activity', 'transport', 'note'];

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const {
    currentTrip,
    items,
    loading,
    loadTrip,
    updateTrip,
    deleteTrip,
    addItem,
    updateItem,
    removeItem,
  } = useTripStore();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [defaultItemType, setDefaultItemType] = useState<ItemType>('activity');
  const [editingItem, setEditingItem] = useState<TripItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  const load = useCallback(() => {
    if (tripId) loadTrip(tripId);
  }, [tripId, loadTrip]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (currentTrip) {
      setNameValue(currentTrip.name);
    }
  }, [currentTrip]);

  if (loading && !currentTrip) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Carregando viagem...</p>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">Viagem nao encontrada.</p>
        <button
          onClick={() => navigate('/trips')}
          className="mt-4 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Voltar para viagens
        </button>
      </div>
    );
  }

  const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
  const grouped = groupItemsByDate(items);

  const handleSaveName = async () => {
    if (nameValue.trim() && nameValue !== currentTrip.name) {
      await updateTrip(currentTrip.id, { name: nameValue.trim() });
    }
    setEditingName(false);
  };

  const handleStatusChange = async (status: Trip['status']) => {
    await updateTrip(currentTrip.id, { status });
  };

  const handleAddItem = (type: ItemType) => {
    setDefaultItemType(type);
    setEditingItem(null);
    setShowItemForm(true);
    setShowAddMenu(false);
  };

  const handleSaveItem = async (data: Omit<TripItem, 'id' | 'tripId' | 'createdAt'>) => {
    if (editingItem) {
      await updateItem(editingItem.id, data);
    } else {
      await addItem(currentTrip.id, data);
    }
    setShowItemForm(false);
    setEditingItem(null);
  };

  const handleEditItem = (item: TripItem) => {
    setEditingItem(item);
    setDefaultItemType(item.itemType);
    setShowItemForm(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    await removeItem(itemId);
  };

  const handleDeleteTrip = async () => {
    await deleteTrip(currentTrip.id);
    navigate('/trips');
  };

  const handleExportText = () => {
    exportTripAsText(currentTrip, items);
  };

  const handleShare = async () => {
    const url = shareTripUrl(currentTrip, items);
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage('Link copiado!');
      setTimeout(() => setShareMessage(''), 2000);
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank');
      setShareMessage('Aberto em nova aba');
      setTimeout(() => setShareMessage(''), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back link */}
      <button
        onClick={() => navigate('/trips')}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 flex items-center gap-1 transition-colors"
      >
        <span>&larr;</span> Voltar para viagens
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-4xl">{currentTrip.coverEmoji}</span>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setNameValue(currentTrip.name);
                        setEditingName(false);
                      }
                    }}
                    autoFocus
                    className="text-2xl font-bold bg-transparent border-b-2 border-blue-500 text-gray-900 dark:text-gray-100 outline-none w-full"
                  />
                </div>
              ) : (
                <h1
                  className="text-2xl font-bold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
                  onClick={() => setEditingName(true)}
                  title="Clique para editar"
                >
                  {currentTrip.name}
                </h1>
              )}

              {/* Dates */}
              {(currentTrip.startDate || currentTrip.endDate) && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {currentTrip.startDate?.slice(0, 10) ?? '...'} - {currentTrip.endDate?.slice(0, 10) ?? '...'}
                </p>
              )}

              {currentTrip.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {currentTrip.description}
                </p>
              )}
            </div>
          </div>

          {/* Status selector */}
          <div>
            <select
              value={currentTrip.status}
              onChange={(e) => handleStatusChange(e.target.value as Trip['status'])}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border-0 cursor-pointer transition-colors ${STATUS_CONFIG[currentTrip.status].color}`}
            >
              {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
                <option key={value} value={value}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Budget summary */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">Custo Total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatPrice(totalCost, currentTrip.currency)}
            </p>
          </div>
          {currentTrip.totalBudget && currentTrip.totalBudget > 0 && (
            <>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">Orcamento</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatPrice(currentTrip.totalBudget, currentTrip.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">Saldo</p>
                <p className={`text-xl font-bold ${
                  currentTrip.totalBudget - totalCost >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatPrice(currentTrip.totalBudget - totalCost, currentTrip.currency)}
                </p>
              </div>
              <div className="flex-1 min-w-[120px]">
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      totalCost > currentTrip.totalBudget
                        ? 'bg-red-500'
                        : totalCost > currentTrip.totalBudget * 0.8
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, (totalCost / currentTrip.totalBudget) * 100)}%` }}
                  />
                </div>
              </div>
            </>
          )}
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">Itens</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{items.length}</p>
          </div>
        </div>
      </div>

      {/* Add item bar + action buttons */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        {/* Add item dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            Adicionar Item
          </button>
          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                {ITEM_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleAddItem(type)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <span>{TYPE_ICONS[type]}</span>
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {shareMessage && (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">{shareMessage}</span>
          )}
          <button
            onClick={handleExportText}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Exportar como texto"
          >
            Exportar TXT
          </button>
          <button
            onClick={handleShare}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Compartilhar"
          >
            Compartilhar
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            title="Excluir viagem"
          >
            Excluir Viagem
          </button>
        </div>
      </div>

      {/* Timeline / Itinerary */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center transition-colors">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Itinerario vazio
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Adicione voos, hoteis, atividades e mais ao seu roteiro.
          </p>
          <button
            onClick={() => handleAddItem('activity')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Adicionar Primeiro Item
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, dayItems]) => (
            <div key={dateLabel}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {dateLabel}
                </h3>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
              </div>

              {/* Day items */}
              <div className="ml-1.5 border-l-2 border-gray-200 dark:border-gray-700 pl-6 space-y-3">
                {dayItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-all group cursor-pointer"
                    onClick={() => handleEditItem(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-xl shrink-0">{TYPE_ICONS[item.itemType]}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {item.title}
                          </h4>

                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                            {item.dateStart && (
                              <span>{item.dateStart.slice(0, 16).replace('T', ' ')}</span>
                            )}
                            {item.location && (
                              <span className="flex items-center gap-1">
                                <LocationIcon />
                                {item.location}
                              </span>
                            )}
                          </div>

                          {item.notes && (
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.cost > 0 && (
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatPrice(item.cost, item.currency)}
                          </span>
                        )}

                        {item.bookingUrl && (
                          <a
                            href={item.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                            title="Abrir link de reserva"
                          >
                            <LinkIcon />
                          </a>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item.id);
                          }}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Remover item"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item form modal */}
      {showItemForm && (
        <TripItemForm
          initialData={editingItem ?? undefined}
          defaultType={defaultItemType}
          onSave={handleSaveItem}
          onCancel={() => {
            setShowItemForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Excluir viagem?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Esta acao ira remover a viagem &quot;{currentTrip.name}&quot; e todos os seus itens permanentemente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteTrip}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupItemsByDate(items: TripItem[]): Record<string, TripItem[]> {
  const groups: Record<string, TripItem[]> = {};
  for (const item of items) {
    const key = item.dateStart ? item.dateStart.slice(0, 10) : 'Sem data definida';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function LocationIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.856-2.07a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.07" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
