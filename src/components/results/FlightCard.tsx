import type { Flight } from '../../agents/types';
import { formatPrice, formatBaggage } from '../../utils/formatters';
import FlightTimeline from './FlightTimeline';

interface FlightCardProps {
  flight: Flight;
  rank: number;
  onSelect: (id: string) => void;
  isComparing?: boolean;
  onToggleCompare?: (id: string) => void;
}

export default function FlightCard({ flight, rank, onSelect, isComparing = false, onToggleCompare }: FlightCardProps) {
  const badges = flight.badges ?? [];
  const hasBadge = badges.length > 0;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 cursor-pointer ${
        isComparing
          ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900'
          : hasBadge
            ? 'border-blue-200 dark:border-blue-700'
            : 'border-gray-200 dark:border-gray-700'
      }`}
      onClick={() => onSelect(flight.id)}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: rank + badges + compare */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Compare checkbox */}
          {onToggleCompare && (
            <label
              className="flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isComparing}
                onChange={() => onToggleCompare(flight.id)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>
          )}

          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-400 dark:text-gray-500">#{rank}</span>
            {flight.rankScore != null && (
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{flight.rankScore}</span>
            )}
          </div>

          {badges.map((b) => (
            <span
              key={b}
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeStyle(b)}`}
            >
              {badgeLabel(b)}
            </span>
          ))}
        </div>

        {/* Right: price */}
        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatPrice(flight.price, flight.currency)}
          </p>
          {flight.pricePerPerson && flight.pricePerPerson !== flight.price && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {formatPrice(flight.pricePerPerson, flight.currency)}/pessoa
            </p>
          )}
        </div>
      </div>

      {/* Flight timeline - outbound */}
      <div className="mt-3">
        <FlightTimeline
          departure={flight.outboundDeparture}
          arrival={flight.outboundArrival}
          origin={flight.outboundOrigin}
          dest={flight.outboundDest}
          airline={flight.outboundAirline}
          flightNo={flight.outboundFlightNo}
          durationMin={flight.outboundDurationMin}
          stops={flight.outboundStops}
          stopCities={flight.outboundStopCities}
          stopDurations={flight.outboundStopDurations}
          compact
        />
      </div>

      {/* Return flight timeline (if roundtrip) */}
      {flight.returnDeparture && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <FlightTimeline
            departure={flight.returnDeparture}
            arrival={flight.returnArrival!}
            origin={flight.returnOrigin!}
            dest={flight.returnDest!}
            airline={flight.returnAirline}
            flightNo={flight.returnFlightNo}
            durationMin={flight.returnDurationMin}
            stops={flight.returnStops ?? 0}
            stopCities={flight.returnStopCities}
            stopDurations={flight.returnStopDurations}
            compact
          />
        </div>
      )}

      {/* Meta row */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          {flight.fareClass && (
            <span className="capitalize bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded">{flight.fareClass}</span>
          )}
          {flight.baggageIncluded && (
            <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded">
              <BaggageIcon />
              {formatBaggage(flight.baggageIncluded)}
            </span>
          )}
          {flight.refundable && (
            <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded font-medium">
              Reembolsavel
            </span>
          )}
        </div>

        {flight.rankReasoning && (
          <p className="text-gray-400 dark:text-gray-500 truncate max-w-xs italic">
            &ldquo;{flight.rankReasoning}&rdquo;
          </p>
        )}
      </div>

      {/* Booking button */}
      {flight.bookingUrl && (
        <div className="mt-3 flex justify-end">
          <a
            href={flight.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
          >
            Reservar
          </a>
        </div>
      )}
    </div>
  );
}

function BaggageIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function badgeStyle(badge: string): string {
  switch (badge) {
    case 'best_price': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    case 'shortest': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'recommended': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
    case 'best_value': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}

function badgeLabel(badge: string): string {
  switch (badge) {
    case 'best_price': return 'Mais Barato';
    case 'shortest': return 'Mais Rapido';
    case 'recommended': return 'Recomendado';
    case 'best_value': return 'Melhor Custo-Beneficio';
    default: return badge;
  }
}
