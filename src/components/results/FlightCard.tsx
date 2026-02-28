import type { Flight } from '../../agents/types';
import { formatPrice, formatDuration, formatTime, formatStops } from '../../utils/formatters';

interface FlightCardProps {
  flight: Flight;
  rank: number;
  onSelect: (id: string) => void;
}

export default function FlightCard({ flight, rank, onSelect }: FlightCardProps) {
  const badges = flight.badges ?? [];
  const hasBadge = badges.length > 0;

  return (
    <div
      className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-md cursor-pointer ${
        hasBadge ? 'border-blue-200' : 'border-gray-200'
      }`}
      onClick={() => onSelect(flight.id)}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: rank + badges */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-400">#{rank}</span>
            {flight.rankScore != null && (
              <span className="text-xs font-bold text-blue-600">{flight.rankScore}</span>
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
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(flight.price, flight.currency)}
          </p>
          {flight.pricePerPerson && flight.pricePerPerson !== flight.price && (
            <p className="text-xs text-gray-400">
              {formatPrice(flight.pricePerPerson, flight.currency)}/pessoa
            </p>
          )}
        </div>
      </div>

      {/* Flight timeline */}
      <div className="mt-3 flex items-center gap-4">
        <div className="text-center">
          <p className="text-lg font-semibold">{formatTime(flight.outboundDeparture)}</p>
          <p className="text-xs text-gray-500">{flight.outboundOrigin}</p>
        </div>

        <div className="flex-1 flex flex-col items-center">
          <p className="text-xs text-gray-400">
            {flight.outboundDurationMin
              ? formatDuration(flight.outboundDurationMin)
              : '—'}
          </p>
          <div className="w-full flex items-center gap-1">
            <div className="flex-1 border-t border-gray-300" />
            {flight.outboundStops > 0 && (
              <span className="text-xs text-orange-500 px-1">
                {formatStops(flight.outboundStops)}
              </span>
            )}
            <div className="flex-1 border-t border-gray-300" />
            <span className="text-gray-400">✈</span>
          </div>
          {flight.outboundStopCities && flight.outboundStopCities.length > 0 && (
            <p className="text-xs text-gray-400">
              via {flight.outboundStopCities.join(', ')}
            </p>
          )}
        </div>

        <div className="text-center">
          <p className="text-lg font-semibold">{formatTime(flight.outboundArrival)}</p>
          <p className="text-xs text-gray-500">{flight.outboundDest}</p>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {flight.outboundAirline && (
            <span className="font-medium text-gray-700">
              {flight.outboundAirline} {flight.outboundFlightNo ?? ''}
            </span>
          )}
          {flight.fareClass && (
            <span className="capitalize">{flight.fareClass}</span>
          )}
        </div>

        {flight.rankReasoning && (
          <p className="text-gray-400 truncate max-w-xs italic">
            "{flight.rankReasoning}"
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

function badgeStyle(badge: string): string {
  switch (badge) {
    case 'best_price': return 'bg-green-100 text-green-700';
    case 'shortest': return 'bg-blue-100 text-blue-700';
    case 'recommended': return 'bg-yellow-100 text-yellow-700';
    case 'best_value': return 'bg-purple-100 text-purple-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function badgeLabel(badge: string): string {
  switch (badge) {
    case 'best_price': return '💰 Mais Barato';
    case 'shortest': return '⚡ Mais Rápido';
    case 'recommended': return '⭐ Recomendado';
    case 'best_value': return '🏆 Melhor Custo-Benefício';
    default: return badge;
  }
}
