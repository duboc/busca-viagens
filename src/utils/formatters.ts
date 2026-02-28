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
