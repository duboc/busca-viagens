import type { Flight, Search } from '../agents/types';
import type { AgentLog } from '../db/repositories/AgentLogRepository';
import { formatDuration } from '../utils/formatters';

/**
 * Escape a value for CSV: wrap in quotes if it contains commas, quotes, or newlines.
 */
function escapeCSV(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  return escapeCSV(String(value));
}

/**
 * Export flights to a CSV Blob with BOM for Excel UTF-8 compatibility.
 */
export function exportCSV(flights: Flight[], searchInfo: Search): Blob {
  const headers = [
    'Airline',
    'Flight',
    'Origin',
    'Destination',
    'Departure',
    'Arrival',
    'Duration',
    'Stops',
    'Price',
    'Currency',
    'Class',
    'Booking URL',
  ];

  const rows = flights.map((f) => [
    cell(f.outboundAirline),
    cell(f.outboundFlightNo),
    cell(f.outboundOrigin),
    cell(f.outboundDest),
    cell(f.outboundDeparture),
    cell(f.outboundArrival),
    cell(f.outboundDurationMin ? formatDuration(f.outboundDurationMin) : ''),
    cell(f.outboundStops),
    cell(f.price),
    cell(f.currency),
    cell(f.fareClass ?? searchInfo.cabinClass),
    cell(f.bookingUrl),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  // BOM (Byte Order Mark) for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  return new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Export flights + search metadata + optional agent logs as structured JSON.
 */
export function exportJSON(
  flights: Flight[],
  searchInfo: Search,
  agentLogs?: AgentLog[],
): Blob {
  const payload = {
    exportedAt: new Date().toISOString(),
    search: searchInfo,
    flights,
    ...(agentLogs && agentLogs.length > 0 ? { agentLogs } : {}),
  };

  const json = JSON.stringify(payload, null, 2);
  return new Blob([json], { type: 'application/json;charset=utf-8;' });
}

/**
 * Trigger a browser download for a Blob with a given filename.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}
