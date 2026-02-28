import type { Flight } from '../../agents/types';
import { formatPrice, formatDate, formatBaggage } from '../../utils/formatters';
import FlightTimeline from './FlightTimeline';

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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  {flight.outboundAirline} {flight.outboundFlightNo}
                </span>
                <span className="text-xs text-gray-500">{formatDate(flight.outboundDeparture)}</span>
              </div>
              <FlightTimeline
                departure={flight.outboundDeparture}
                arrival={flight.outboundArrival}
                origin={flight.outboundOrigin}
                dest={flight.outboundDest}
                durationMin={flight.outboundDurationMin}
                stops={flight.outboundStops}
                stopCities={flight.outboundStopCities}
                stopDurations={flight.outboundStopDurations}
              />
            </div>
          </Section>

          {/* Return */}
          {flight.returnDeparture && (
            <Section title="Volta">
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    {flight.returnAirline} {flight.returnFlightNo}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(flight.returnDeparture)}</span>
                </div>
                <FlightTimeline
                  departure={flight.returnDeparture}
                  arrival={flight.returnArrival!}
                  origin={flight.returnOrigin!}
                  dest={flight.returnDest!}
                  durationMin={flight.returnDurationMin}
                  stops={flight.returnStops ?? 0}
                  stopCities={flight.returnStopCities}
                  stopDurations={flight.returnStopDurations}
                />
              </div>
            </Section>
          )}

          {/* Details */}
          <Section title="Informacoes">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailItem label="Classe" value={flight.fareClass ?? 'Economica'} />
              <DetailItem label="Reembolsavel" value={flight.refundable ? 'Sim' : 'Nao'} />
              <DetailItem label="Confianca" value={`${Math.round(flight.confidence * 100)}%`} />
              <DetailItem label="Fonte" value={flight.source} />
              {flight.rankScore != null && (
                <DetailItem label="Score" value={`${flight.rankScore}/100`} />
              )}
              {flight.baggageIncluded && (
                <div className="col-span-2">
                  <DetailItem label="Bagagem" value={formatBaggage(flight.baggageIncluded)} />
                </div>
              )}
            </div>
          </Section>

          {/* Ranking reasoning */}
          {flight.rankReasoning && (
            <Section title="Analise">
              <p className="text-sm text-gray-600 italic">&ldquo;{flight.rankReasoning}&rdquo;</p>
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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-700 capitalize">{value}</p>
    </div>
  );
}
