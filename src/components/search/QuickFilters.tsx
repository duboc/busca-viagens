import type { SearchPlan } from '../../agents/types';

interface QuickFiltersProps {
  plan: SearchPlan | null;
}

export default function QuickFilters({ plan }: QuickFiltersProps) {
  if (!plan) return null;

  const { intent } = plan;

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-gray-500 font-medium">Filtros:</span>

        <Tag label={intent.tripType === 'roundtrip' ? 'Ida e Volta' : intent.tripType === 'oneway' ? 'Só Ida' : 'Multi-city'} />
        <Tag label={`${intent.passengers} ${intent.passengers === 1 ? 'adulto' : 'adultos'}`} />
        <Tag label={cabinLabel(intent.cabin)} />

        {intent.origins.length > 0 && (
          <Tag label={`De: ${intent.origins.map((o) => o.iata).join(', ')}`} variant="blue" />
        )}
        {intent.destinations.length > 0 && (
          <Tag label={`Para: ${intent.destinations.map((d) => d.iata).join(', ')}`} variant="blue" />
        )}

        {intent.dateRanges.length > 0 && (
          <Tag label={`${intent.dateRanges[0].from} → ${intent.dateRanges[0].to}`} variant="green" />
        )}

        {intent.flexibility > 0 && (
          <Tag label={`±${intent.flexibility} dias`} variant="yellow" />
        )}

        {intent.budget && (
          <Tag label={`R$ ${intent.budget.amount.toLocaleString('pt-BR')}`} variant="orange" />
        )}
      </div>
    </div>
  );
}

function Tag({ label, variant = 'gray' }: { label: string; variant?: 'gray' | 'blue' | 'green' | 'yellow' | 'orange' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[variant]}`}>
      {label}
    </span>
  );
}

function cabinLabel(cabin: string): string {
  const map: Record<string, string> = {
    economy: 'Econômica',
    premium_economy: 'Premium Economy',
    business: 'Executiva',
    first: 'Primeira Classe',
  };
  return map[cabin] ?? cabin;
}
