import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchStore } from '../../stores/searchStore';
import { useUIStore } from '../../stores/uiStore';
import { useAgentStore } from '../../stores/agentStore';
import { exportCSV, exportJSON, downloadBlob } from '../../services/export';
import { formatElapsedTime } from '../../utils/formatters';
import { getAirlinesByAlliance } from '../../db/repositories/FlightRepository';
import FlightCard from './FlightCard';
import BadgeBar from './BadgeBar';
import SortFilterBar from './SortFilterBar';
import AllianceFilter from './AllianceFilter';
import CalendarHeatmap from './CalendarHeatmap';
import PriceChart from './PriceChart';
import FlightDetailModal from './FlightDetailModal';
import AgentStatusBar from '../agent/AgentStatusBar';
import AlertForm from '../alerts/AlertForm';
import EmptyState from '../shared/EmptyState';
import { FlightCardSkeletonList } from '../shared/Skeleton';

export default function ResultsPage() {
  const { currentSearch, flights, sortBy, filterStops, setSortBy, setFilterStops, toggleCompare, compareIds, filterAlliance } = useSearchStore();
  const [allianceAirlineCodes, setAllianceAirlineCodes] = useState<Set<string>>(new Set());
  const { selectedFlightId, detailModalOpen, openDetailModal, closeDetailModal } = useUIStore();
  const { isRunning, searchStartTime, searchEndTime } = useAgentStore();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPriceChart, setShowPriceChart] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Load airline codes for the selected alliance
  useEffect(() => {
    if (!filterAlliance) {
      setAllianceAirlineCodes(new Set());
      return;
    }
    getAirlinesByAlliance(filterAlliance)
      .then((airlines) => {
        setAllianceAirlineCodes(new Set(airlines.map((a) => a.iataCode)));
      })
      .catch(() => setAllianceAirlineCodes(new Set()));
  }, [filterAlliance]);

  const filteredAndSorted = useMemo(() => {
    let result = [...flights];

    if (filterStops !== null) {
      result = result.filter((f) => f.outboundStops <= filterStops);
    }

    // Alliance filter
    if (filterAlliance && allianceAirlineCodes.size > 0) {
      result = result.filter((f) => {
        const outboundCode = f.outboundAirline?.substring(0, 2)?.toUpperCase();
        const returnCode = f.returnAirline?.substring(0, 2)?.toUpperCase();
        return (
          (outboundCode && allianceAirlineCodes.has(outboundCode)) ||
          (returnCode && allianceAirlineCodes.has(returnCode))
        );
      });
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
  }, [flights, sortBy, filterStops, filterAlliance, allianceAirlineCodes]);

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

  const minPrice = useMemo(() => {
    if (flights.length === 0) return 0;
    return Math.min(...flights.map((f) => f.price));
  }, [flights]);

  // Calculate search time
  const searchTimeStr = useMemo(() => {
    if (searchStartTime && searchEndTime && !isRunning) {
      return formatElapsedTime(searchEndTime - searchStartTime);
    }
    return null;
  }, [searchStartTime, searchEndTime, isRunning]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleExportCSV = useCallback(() => {
    if (!currentSearch || flights.length === 0) return;
    const blob = exportCSV(flights, currentSearch);
    const filename = `skyagent_${currentSearch.parsedOrigin ?? 'search'}_${currentSearch.parsedDest ?? ''}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadBlob(blob, filename);
    showToast('CSV exportado com sucesso!');
  }, [currentSearch, flights, showToast]);

  const handleExportJSON = useCallback(() => {
    if (!currentSearch || flights.length === 0) return;
    const blob = exportJSON(flights, currentSearch);
    const filename = `skyagent_${currentSearch.parsedOrigin ?? 'search'}_${currentSearch.parsedDest ?? ''}_${new Date().toISOString().slice(0, 10)}.json`;
    downloadBlob(blob, filename);
    showToast('JSON exportado com sucesso!');
  }, [currentSearch, flights, showToast]);

  const handleAlertCreated = useCallback(() => {
    setShowAlertForm(false);
    showToast('Alerta de preco criado!');
  }, [showToast]);

  if (!currentSearch) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <EmptyState
          icon="🔍"
          title="Nenhuma busca ativa"
          description="Faca uma busca para ver os resultados aqui."
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
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm text-blue-600 hover:underline">&larr; Voltar</Link>
          <h1 className="text-lg font-bold text-gray-900 mt-1">
            {currentSearch.parsedOrigin ?? '?'} &rarr; {currentSearch.parsedDest ?? '?'}
            {currentSearch.dateFrom && `, ${currentSearch.dateFrom}`}
          </h1>
          {searchTimeStr && (
            <p className="text-xs text-gray-400 mt-0.5">
              Busca concluida em {searchTimeStr} &middot; {flights.length} {flights.length === 1 ? 'resultado' : 'resultados'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {flights.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                title="Exportar CSV"
              >
                CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                title="Exportar JSON"
              >
                JSON
              </button>
              <button
                onClick={() => setShowAlertForm(!showAlertForm)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                {showAlertForm ? 'Fechar' : 'Criar Alerta'}
              </button>
            </>
          )}
          <button
            onClick={() => setShowPriceChart(!showPriceChart)}
            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
              showPriceChart
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
          >
            {showPriceChart ? 'Esconder Grafico' : 'Grafico'}
          </button>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
              showCalendar
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
          >
            {showCalendar ? 'Esconder Calendario' : 'Calendario'}
          </button>
        </div>
      </div>

      {/* Alert form */}
      {showAlertForm && currentSearch.id && flights.length > 0 && (
        <AlertForm
          searchId={currentSearch.id}
          currentMinPrice={minPrice}
          currency={currentSearch.currency}
          onCreated={handleAlertCreated}
        />
      )}

      {/* Agent status */}
      {isRunning && <AgentStatusBar />}

      {/* Badge bar */}
      {flights.length > 0 && <BadgeBar flights={flights} />}

      {/* Calendar */}
      {showCalendar && flights.length > 0 && (
        <CalendarHeatmap flights={flights} month={calendarMonth} />
      )}

      {/* Price chart */}
      {showPriceChart && flights.length > 0 && (
        <PriceChart flights={flights} currency={currentSearch.currency} />
      )}

      {/* Sort & filter */}
      {flights.length > 0 && (
        <div className="space-y-2">
          <SortFilterBar
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterStops={filterStops}
            onFilterStopsChange={setFilterStops}
            totalResults={filteredAndSorted.length}
          />
          <AllianceFilter />
        </div>
      )}

      {/* Skeleton loading state */}
      {isRunning && flights.length === 0 && (
        <FlightCardSkeletonList count={4} />
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
              isComparing={compareIds.has(flight.id)}
              onToggleCompare={toggleCompare}
            />
          ))}
        </div>
      ) : !isRunning ? (
        <EmptyState
          icon="✈️"
          title="Nenhum voo encontrado"
          description="Tente ajustar os filtros ou fazer uma nova busca com datas mais flexiveis."
        />
      ) : null}

      {/* Skeleton after first results while still loading */}
      {isRunning && flights.length > 0 && (
        <FlightCardSkeletonList count={2} />
      )}

      {/* Detail modal */}
      <FlightDetailModal
        flight={selectedFlight}
        open={detailModalOpen}
        onClose={closeDetailModal}
      />
    </div>
  );
}
