import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDatabase } from '../../db/database';
import { formatPrice } from '../../utils/formatters';
import LoadingSpinner from '../shared/LoadingSpinner';
import EmptyState from '../shared/EmptyState';
import PriceByRouteChart from './PriceByRouteChart';
import PriceOverTimeChart from './PriceOverTimeChart';
import BestDayChart from './BestDayChart';
import SearchActivityChart from './SearchActivityChart';

interface DashboardStats {
  totalSearches: number;
  totalFlights: number;
  avgPrice: number | null;
  mostSearchedRoute: string | null;
  mostSearchedRouteCount: number;
  cheapestPrice: number | null;
  cheapestRoute: string | null;
  lastSearchDate: string | null;
}

const EMPTY_STATS: DashboardStats = {
  totalSearches: 0,
  totalFlights: 0,
  avgPrice: null,
  mostSearchedRoute: null,
  mostSearchedRouteCount: 0,
  cheapestPrice: null,
  cheapestRoute: null,
  lastSearchDate: null,
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();

        // Total searches
        const searchCountResult = db.exec('SELECT COUNT(*) FROM searches');
        const totalSearches =
          searchCountResult.length > 0
            ? Number(searchCountResult[0].values[0][0])
            : 0;

        // Total flights
        const flightCountResult = db.exec('SELECT COUNT(*) FROM flights');
        const totalFlights =
          flightCountResult.length > 0
            ? Number(flightCountResult[0].values[0][0])
            : 0;

        // Average price
        const avgPriceResult = db.exec('SELECT AVG(price) FROM flights');
        const avgPrice =
          avgPriceResult.length > 0 && avgPriceResult[0].values[0][0] !== null
            ? Math.round(Number(avgPriceResult[0].values[0][0]))
            : null;

        // Most searched route (origin -> dest from searches table)
        const mostRouteResult = db.exec(
          `SELECT parsed_origin || '\u2192' || parsed_dest as route, COUNT(*) as cnt
           FROM searches
           WHERE parsed_origin IS NOT NULL AND parsed_dest IS NOT NULL
           GROUP BY route
           ORDER BY cnt DESC
           LIMIT 1`
        );
        const mostSearchedRoute =
          mostRouteResult.length > 0
            ? String(mostRouteResult[0].values[0][0])
            : null;
        const mostSearchedRouteCount =
          mostRouteResult.length > 0
            ? Number(mostRouteResult[0].values[0][1])
            : 0;

        // Cheapest flight ever found
        const cheapestResult = db.exec(
          `SELECT price, outbound_origin || '\u2192' || outbound_dest as route
           FROM flights
           ORDER BY price ASC
           LIMIT 1`
        );
        const cheapestPrice =
          cheapestResult.length > 0
            ? Number(cheapestResult[0].values[0][0])
            : null;
        const cheapestRoute =
          cheapestResult.length > 0
            ? String(cheapestResult[0].values[0][1])
            : null;

        // Last search date
        const lastSearchResult = db.exec(
          `SELECT created_at FROM searches ORDER BY created_at DESC LIMIT 1`
        );
        const lastSearchDate =
          lastSearchResult.length > 0
            ? String(lastSearchResult[0].values[0][0])
            : null;

        setStats({
          totalSearches,
          totalFlights,
          avgPrice,
          mostSearchedRoute,
          mostSearchedRouteCount,
          cheapestPrice,
          cheapestRoute,
          lastSearchDate,
        });
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Carregando analytics..." />;
  }

  if (stats.totalSearches === 0 && stats.totalFlights === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Analytics</h1>
        <EmptyState
          icon="📊"
          title="Sem dados para exibir"
          description="Faca algumas buscas para ver suas estatisticas e graficos aqui."
          action={
            <Link
              to="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Fazer Primeira Busca
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <Link
          to="/history"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Ver historico completo
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard
          label="Buscas Realizadas"
          value={String(stats.totalSearches)}
          icon={<SearchIcon />}
          color="blue"
        />
        <StatCard
          label="Voos Encontrados"
          value={String(stats.totalFlights)}
          icon={<PlaneIcon />}
          color="indigo"
        />
        <StatCard
          label="Preco Medio"
          value={stats.avgPrice !== null ? formatPrice(stats.avgPrice) : '--'}
          icon={<ChartIcon />}
          color="purple"
        />
        <StatCard
          label="Rota Mais Buscada"
          value={stats.mostSearchedRoute ?? '--'}
          subtitle={
            stats.mostSearchedRouteCount > 0
              ? `${stats.mostSearchedRouteCount} ${stats.mostSearchedRouteCount === 1 ? 'busca' : 'buscas'}`
              : undefined
          }
          icon={<RouteIcon />}
          color="pink"
        />
        <StatCard
          label="Voo Mais Barato"
          value={
            stats.cheapestPrice !== null
              ? formatPrice(stats.cheapestPrice)
              : '--'
          }
          subtitle={stats.cheapestRoute ?? undefined}
          icon={<TagIcon />}
          color="green"
        />
        <StatCard
          label="Ultima Busca"
          value={stats.lastSearchDate ? formatLastSearch(stats.lastSearchDate) : '--'}
          icon={<ClockIcon />}
          color="amber"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PriceByRouteChart />
        <PriceOverTimeChart />
        <BestDayChart />
        <SearchActivityChart />
      </div>
    </div>
  );
}

/* ---------- Stat Card ---------- */

const COLOR_MAP: Record<string, { bg: string; text: string; iconBg: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', iconBg: 'bg-indigo-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-100' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-700', iconBg: 'bg-pink-100' },
  green: { bg: 'bg-green-50', text: 'text-green-700', iconBg: 'bg-green-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100' },
};

function StatCard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        <span className={`${c.iconBg} ${c.text} p-1.5 rounded-lg`}>
          {icon}
        </span>
      </div>
      <p className={`text-lg font-bold ${c.text} truncate`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 truncate">{subtitle}</p>
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */

function formatLastSearch(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch {
    return isoDate.slice(0, 10);
  }
}

/* ---------- Icons ---------- */

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
