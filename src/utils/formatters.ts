import { format, formatDistanceStrict, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatPrice(amount: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "dd/MM HH:mm");
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "dd 'de' MMM", { locale: ptBR });
}

export function formatDateFull(iso: string): string {
  return format(parseISO(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm');
}

export function formatRelativeTime(iso: string): string {
  return formatDistanceStrict(parseISO(iso), new Date(), {
    locale: ptBR,
    addSuffix: true,
  });
}

export function formatStops(stops: number): string {
  if (stops === 0) return 'Direto';
  if (stops === 1) return '1 parada';
  return `${stops} paradas`;
}

export function formatElapsedTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m${remainingSeconds}s`;
}

export function formatBaggage(baggage: { carry_on: boolean; checked: number }): string {
  const parts: string[] = [];
  if (baggage.carry_on) parts.push('Bagagem de mao');
  if (baggage.checked > 0) {
    parts.push(`${baggage.checked} ${baggage.checked === 1 ? 'mala despachada' : 'malas despachadas'}`);
  }
  if (parts.length === 0) return 'Sem bagagem inclusa';
  return parts.join(' + ');
}
