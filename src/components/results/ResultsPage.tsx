import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchStore } from '../../stores/searchStore';
import { useUIStore } from '../../stores/uiStore';
import { useAgentStore } from '../../stores/agentStore';
import FlightCard from './FlightCard';
import BadgeBar from './BadgeBar';
import SortFilterBar from './SortFilterBar';
import CalendarHeatmap from './CalendarHeatmap';
import FlightDetailModal from './FlightDetailModal';
import AgentStatusBar from '../agent/AgentStatusBar';
import EmptyState from '../shared/EmptyState';

export default function ResultsPage() {
  const { currentSearch, flights, sortBy, filterStops, setSortBy, setFilterStops } = useSearchStore();
  const { selectedFlightId, detailModalOpen, openDetailModal, closeDetailModal } = useUIStore();
  const { isRunning } = useAgentStore();
  const [showCalendar, setShowCalendar] = useState(false);

  const filteredAndSorted = useMemo(() => {
    let result = [...flights];

    if (filterStops !== null) {
      result = result.filter((f) => f.outboundStops <= filterStops);
    }

    switch (sortBy) {
      case 'price':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'duration':
        result.sort(
          (a, b) =>
            (a.outboundDurationMin ?? 9999) - (b.outboundDurationMin ?? 9999),
        );
        break;
      case 'stops':
        result.sort((a, b) => a.outboundStops - b.outboundStops);
        break;
      default:
        result.sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));
    }

    return result;
  }, [flights, sortBy, filterStops]);

  const selectedFlight = selectedFlightId
    ? flights.find((f) => f.id === selectedFlightId) ?? null
    : null;

  const calendarMonth = useMemo(() => {
    if (flights.length === 0) return new Date();
    try {
      return new Date(flights[0].outboundDeparture);
    } catch {
      return new Date();
    }
  }, [flights]);

  if (!currentSearch) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <EmptyState
          icon="🔍"
          title="Nenhuma busca ativa"
          description="Faça uma busca para ver os resultados aqui."
          action={
            <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Nova Busca
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm text-blue-600 hover:underline">← Voltar</Link>
          <h1 className="text-lg font-bold text-gray-900 mt-1">
            {currentSearch.parsedOrigin ?? '?'} → {currentSearch.parsedDest ?? '?'}
            {currentSearch.dateFrom && `, ${currentSearch.dateFrom}`}
          </h1>
        </div>
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          {showCalendar ? 'Esconder Calendário' : '📅 Calendário'}
        </button>
      </div>

      {/* Agent status */}
      {isRunning && <AgentStatusBar />}

      {/* Badge bar */}
      {flights.length > 0 && <BadgeBar flights={flights} />}

      {/* Calendar */}
      {showCalendar && flights.length > 0 && (
        <CalendarHeatmap flights={flights} month={calendarMonth} />
      )}

      {/* Sort & filter */}
      {flights.length > 0 && (
        <SortFilterBar
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterStops={filterStops}
          onFilterStopsChange={setFilterStops}
          totalResults={filteredAndSorted.length}
        />
      )}

      {/* Flight list */}
      {filteredAndSorted.length > 0 ? (
        <div className="space-y-3">
          {filteredAndSorted.map((flight, i) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              rank={i + 1}
              onSelect={openDetailModal}
            />
          ))}
        </div>
      ) : !isRunning ? (
        <EmptyState
          icon="✈️"
          title="Nenhum voo encontrado"
          description="Tente ajustar os filtros ou fazer uma nova busca com datas mais flexíveis."
        />
      ) : null}

      {/* Detail modal */}
      <FlightDetailModal
        flight={selectedFlight}
        open={detailModalOpen}
        onClose={closeDetailModal}
      />
    </div>
  );
}
