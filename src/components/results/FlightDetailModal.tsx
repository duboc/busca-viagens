import type { Flight } from '../../agents/types';
import { formatPrice, formatDuration, formatTime, formatDate, formatStops } from '../../utils/formatters';

interface FlightDetailModalProps {
  flight: Flight | null;
  open: boolean;
  onClose: () => void;
}

export default function FlightDetailModal({ flight, open, onClose }: FlightDetailModalProps) {
  if (!open || !flight) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">Detalhes do Voo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Price */}
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">
              {formatPrice(flight.price, flight.currency)}
            </p>
            {flight.badges?.map((b) => (
              <span
                key={b}
                className="inline-block mt-1 mx-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700"
              >
                {b}
              </span>
            ))}
          </div>

          {/* Outbound */}
          <Section title="Ida">
            <FlightLeg
              airline={flight.outboundAirline}
              flightNo={flight.outboundFlightNo}
              departure={flight.outboundDeparture}
              arrival={flight.outboundArrival}
              origin={flight.outboundOrigin}
              dest={flight.outboundDest}
              duration={flight.outboundDurationMin}
              stops={flight.outboundStops}
              stopCities={flight.outboundStopCities}
            />
          </Section>

          {/* Return */}
          {flight.returnDeparture && (
            <Section title="Volta">
              <FlightLeg
                airline={flight.returnAirline}
                flightNo={flight.returnFlightNo}
                departure={flight.returnDeparture}
                arrival={flight.returnArrival!}
                origin={flight.returnOrigin!}
                dest={flight.returnDest!}
                duration={flight.returnDurationMin}
                stops={flight.returnStops ?? 0}
                stopCities={flight.returnStopCities}
              />
            </Section>
          )}

          {/* Details */}
          <Section title="Informações">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailItem label="Classe" value={flight.fareClass ?? 'Econômica'} />
              <DetailItem label="Reembolsável" value={flight.refundable ? 'Sim' : 'Não'} />
              <DetailItem label="Confiança" value={`${Math.round(flight.confidence * 100)}%`} />
              <DetailItem label="Fonte" value={flight.source} />
              {flight.rankScore != null && (
                <DetailItem label="Score" value={`${flight.rankScore}/100`} />
              )}
            </div>
          </Section>

          {/* Ranking reasoning */}
          {flight.rankReasoning && (
            <Section title="Análise">
              <p className="text-sm text-gray-600 italic">"{flight.rankReasoning}"</p>
            </Section>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {flight.bookingUrl && (
              <a
                href={flight.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Reservar
              </a>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function FlightLeg({
  airline, flightNo, departure, arrival, origin, dest, duration, stops, stopCities,
}: {
  airline?: string; flightNo?: string; departure: string; arrival: string;
  origin: string; dest: string; duration?: number; stops: number; stopCities?: string[];
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">{airline} {flightNo}</span>
        <span className="text-xs text-gray-500">{formatDate(departure)}</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold">{formatTime(departure)}</p>
          <p className="text-xs text-gray-500">{origin}</p>
        </div>
        <div className="text-center text-xs text-gray-400">
          {duration ? formatDuration(duration) : '—'}
          <br />
          {formatStops(stops)}
          {stopCities?.length ? ` (${stopCities.join(', ')})` : ''}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{formatTime(arrival)}</p>
          <p className="text-xs text-gray-500">{dest}</p>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-700 capitalize">{value}</p>
    </div>
  );
}
