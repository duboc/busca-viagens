interface SortFilterBarProps {
  sortBy: string;
  onSortChange: (sort: 'rank' | 'price' | 'duration' | 'stops') => void;
  filterStops: number | null;
  onFilterStopsChange: (stops: number | null) => void;
  totalResults: number;
}

export default function SortFilterBar({
  sortBy,
  onSortChange,
  filterStops,
  onFilterStopsChange,
  totalResults,
}: SortFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <span className="text-sm text-gray-500">{totalResults} resultados</span>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Ordenar:</label>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as 'rank' | 'price' | 'duration' | 'stops')}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="rank">Recomendado</option>
          <option value="price">Menor Preço</option>
          <option value="duration">Menor Duração</option>
          <option value="stops">Menos Paradas</option>
        </select>

        <div className="flex items-center gap-1 ml-2">
          <FilterChip
            label="Todos"
            active={filterStops === null}
            onClick={() => onFilterStopsChange(null)}
          />
          <FilterChip
            label="Direto"
            active={filterStops === 0}
            onClick={() => onFilterStopsChange(0)}
          />
          <FilterChip
            label="1 parada"
            active={filterStops === 1}
            onClick={() => onFilterStopsChange(1)}
          />
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}
