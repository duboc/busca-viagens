import { formatTime, formatDuration } from '../../utils/formatters';

interface FlightTimelineProps {
  departure: string;
  arrival: string;
  origin: string;
  dest: string;
  airline?: string;
  flightNo?: string;
  durationMin?: number;
  stops: number;
  stopCities?: string[];
  stopDurations?: number[];
  compact?: boolean;
}

export default function FlightTimeline({
  departure,
  arrival,
  origin,
  dest,
  airline,
  flightNo,
  durationMin,
  stops,
  stopCities,
  stopDurations,
  compact = false,
}: FlightTimelineProps) {
  const dotSize = compact ? 'w-2.5 h-2.5' : 'w-3 h-3';
  const stopDotSize = compact ? 'w-2 h-2' : 'w-2.5 h-2.5';

  return (
    <div className="w-full">
      {/* Airline info */}
      {!compact && airline && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">
            {airline}
          </span>
          {flightNo && (
            <span className="text-xs text-gray-400">{flightNo}</span>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="flex items-center gap-3">
        {/* Departure */}
        <div className="text-center shrink-0">
          <p className={compact ? 'text-sm font-semibold' : 'text-lg font-semibold'}>
            {formatTime(departure)}
          </p>
          <p className="text-xs text-gray-500 font-medium">{origin}</p>
        </div>

        {/* Line with stops */}
        <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
          {/* Duration label */}
          <p className="text-xs text-gray-400">
            {durationMin ? formatDuration(durationMin) : '--'}
          </p>

          {/* Timeline line */}
          <div className="w-full flex items-center">
            {/* Origin dot */}
            <div
              className={`${dotSize} rounded-full bg-blue-600 shrink-0`}
            />

            {stops === 0 ? (
              // Direct flight - single line
              <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-600 to-blue-400 mx-0.5" />
            ) : (
              // Stops - segmented line
              <div className="flex-1 flex items-center mx-0.5">
                {Array.from({ length: stops + 1 }).map((_, segIdx) => (
                  <div key={segIdx} className="contents">
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-500 to-blue-300" />
                    {segIdx < stops && (
                      <div className="relative group shrink-0">
                        <div
                          className={`${stopDotSize} rounded-full bg-orange-400 border-2 border-white ring-1 ring-orange-200`}
                        />
                        {/* Tooltip for stop */}
                        {(stopCities?.[segIdx] || stopDurations?.[segIdx]) && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                            <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                              {stopCities?.[segIdx] ?? ''}
                              {stopDurations?.[segIdx]
                                ? ` (${formatDuration(stopDurations[segIdx])})`
                                : ''}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Destination dot */}
            <div
              className={`${dotSize} rounded-full bg-blue-400 shrink-0`}
            />

            {/* Plane icon */}
            <span className="ml-1 text-gray-400 text-xs shrink-0">
              <PlaneIcon />
            </span>
          </div>

          {/* Stop info label */}
          <div className="flex items-center gap-1 text-xs">
            {stops === 0 ? (
              <span className="text-green-600 font-medium">Direto</span>
            ) : (
              <>
                <span className="text-orange-500 font-medium">
                  {stops === 1 ? '1 parada' : `${stops} paradas`}
                </span>
                {stopCities && stopCities.length > 0 && (
                  <span className="text-gray-400">
                    via {stopCities.join(', ')}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Layover durations */}
          {!compact && stopDurations && stopDurations.length > 0 && (
            <div className="flex items-center gap-2">
              {stopDurations.map((dur, i) => (
                <span
                  key={i}
                  className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded"
                >
                  {stopCities?.[i] ?? `Escala ${i + 1}`}:{' '}
                  {formatDuration(dur)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Arrival */}
        <div className="text-center shrink-0">
          <p className={compact ? 'text-sm font-semibold' : 'text-lg font-semibold'}>
            {formatTime(arrival)}
          </p>
          <p className="text-xs text-gray-500 font-medium">{dest}</p>
        </div>
      </div>
    </div>
  );
}

function PlaneIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}
