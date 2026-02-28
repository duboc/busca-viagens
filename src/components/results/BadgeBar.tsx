import type { Flight } from '../../agents/types';
import { formatPrice, formatDuration } from '../../utils/formatters';

interface BadgeBarProps {
  flights: Flight[];
}

export default function BadgeBar({ flights }: BadgeBarProps) {
  if (flights.length === 0) return null;

  const cheapest = flights.reduce((a, b) => (a.price < b.price ? a : b));
  const fastest = flights.reduce((a, b) =>
    (a.outboundDurationMin ?? 9999) < (b.outboundDurationMin ?? 9999) ? a : b,
  );
  const recommended = flights[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <BadgeItem
        icon="💰"
        title="Mais Barato"
        value={formatPrice(cheapest.price, cheapest.currency)}
        subtitle={`${cheapest.outboundAirline ?? 'N/A'}, ${cheapest.outboundStops === 0 ? 'direto' : `${cheapest.outboundStops} parada(s)`}`}
        color="green"
      />
      <BadgeItem
        icon="⚡"
        title="Mais Rápido"
        value={fastest.outboundDurationMin ? formatDuration(fastest.outboundDurationMin) : 'N/A'}
        subtitle={`${fastest.outboundAirline ?? 'N/A'}, ${fastest.outboundStops === 0 ? 'direto' : `${fastest.outboundStops} parada(s)`}`}
        color="blue"
      />
      {recommended && (
        <BadgeItem
          icon="⭐"
          title="Recomendado"
          value={formatPrice(recommended.price, recommended.currency)}
          subtitle={`Score ${recommended.rankScore ?? 'N/A'}/100, ${recommended.outboundAirline ?? 'N/A'}`}
          color="yellow"
        />
      )}
    </div>
  );
}

function BadgeItem({
  icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  color: 'green' | 'blue' | 'yellow';
}) {
  const colors = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
  };

  return (
    <div className={`rounded-xl border p-3 ${colors[color]}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-semibold text-gray-600">{title}</span>
      </div>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}
