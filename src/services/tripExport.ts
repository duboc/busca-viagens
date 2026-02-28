import type { Trip, TripItem } from '../agents/types';
import { downloadBlob } from './export';
import { formatPrice } from '../utils/formatters';

const STATUS_LABELS: Record<Trip['status'], string> = {
  planning: 'Planejando',
  booked: 'Reservado',
  completed: 'Concluida',
  cancelled: 'Cancelada',
};

const TYPE_ICONS: Record<TripItem['itemType'], string> = {
  flight: '[Voo]',
  hotel: '[Hotel]',
  activity: '[Atividade]',
  transport: '[Transporte]',
  note: '[Nota]',
};

function formatItemDate(dateStart?: string, dateEnd?: string): string {
  if (!dateStart) return '';
  const start = dateStart.slice(0, 16).replace('T', ' ');
  if (!dateEnd) return start;
  const end = dateEnd.slice(0, 16).replace('T', ' ');
  return `${start} - ${end}`;
}

/**
 * Generate a formatted text summary of a trip and its items.
 */
export function generateTripSummary(trip: Trip, items: TripItem[]): string {
  const lines: string[] = [];
  const separator = '='.repeat(60);
  const thinSep = '-'.repeat(60);

  lines.push(separator);
  lines.push(`${trip.coverEmoji}  ${trip.name}`);
  lines.push(separator);
  lines.push('');

  if (trip.description) {
    lines.push(trip.description);
    lines.push('');
  }

  lines.push(`Status: ${STATUS_LABELS[trip.status]}`);

  if (trip.startDate || trip.endDate) {
    const start = trip.startDate ? trip.startDate.slice(0, 10) : '...';
    const end = trip.endDate ? trip.endDate.slice(0, 10) : '...';
    lines.push(`Periodo: ${start} ate ${end}`);
  }

  const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
  if (trip.totalBudget) {
    lines.push(`Orcamento: ${formatPrice(trip.totalBudget, trip.currency)}`);
    lines.push(`Custo total: ${formatPrice(totalCost, trip.currency)}`);
    const remaining = trip.totalBudget - totalCost;
    lines.push(`Saldo: ${formatPrice(remaining, trip.currency)}`);
  } else {
    lines.push(`Custo total: ${formatPrice(totalCost, trip.currency)}`);
  }

  lines.push('');
  lines.push(thinSep);
  lines.push('ITINERARIO');
  lines.push(thinSep);
  lines.push('');

  if (items.length === 0) {
    lines.push('Nenhum item adicionado.');
  } else {
    // Group by date
    const grouped = groupItemsByDate(items);
    for (const [dateLabel, dayItems] of Object.entries(grouped)) {
      lines.push(`--- ${dateLabel} ---`);
      lines.push('');
      for (const item of dayItems) {
        const icon = TYPE_ICONS[item.itemType] || '[Item]';
        lines.push(`  ${icon} ${item.title}`);
        const dateStr = formatItemDate(item.dateStart, item.dateEnd);
        if (dateStr) {
          lines.push(`    Horario: ${dateStr}`);
        }
        if (item.location) {
          lines.push(`    Local: ${item.location}`);
        }
        if (item.cost > 0) {
          lines.push(`    Custo: ${formatPrice(item.cost, item.currency)}`);
        }
        if (item.notes) {
          lines.push(`    Notas: ${item.notes}`);
        }
        if (item.bookingUrl) {
          lines.push(`    Reserva: ${item.bookingUrl}`);
        }
        lines.push('');
      }
    }
  }

  lines.push(separator);
  lines.push(`Exportado em: ${new Date().toLocaleString('pt-BR')}`);
  lines.push(`Gerado por SkyAgent`);
  lines.push(separator);

  return lines.join('\n');
}

/**
 * Download the trip as a formatted .txt file.
 */
export function exportTripAsText(trip: Trip, items: TripItem[]): void {
  const content = generateTripSummary(trip, items);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const safeName = trip.name.replace(/[^a-zA-Z0-9\u00C0-\u017F ]/g, '').trim().replace(/\s+/g, '_');
  downloadBlob(blob, `viagem_${safeName}.txt`);
}

/**
 * Generate a shareable data URL with the trip data encoded as base64 JSON.
 */
export function shareTripUrl(trip: Trip, items: TripItem[]): string {
  const payload = {
    trip,
    items,
    exportedAt: new Date().toISOString(),
  };
  const json = JSON.stringify(payload);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return `data:application/json;base64,${base64}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupItemsByDate(items: TripItem[]): Record<string, TripItem[]> {
  const groups: Record<string, TripItem[]> = {};

  for (const item of items) {
    const dateKey = item.dateStart
      ? item.dateStart.slice(0, 10)
      : 'Sem data definida';

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
  }

  return groups;
}
