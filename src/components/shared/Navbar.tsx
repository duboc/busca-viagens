import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const NAV_ITEMS = [
  { to: '/', label: 'Buscar', icon: '🔍' },
  { to: '/history', label: 'Historico', icon: '📊' },
  { to: '/analytics', label: 'Analytics', icon: '📈' },
  { to: '/calendar', label: 'Calendario', icon: '📅' },
  { to: '/alerts', label: 'Alertas', icon: '🔔' },
  { to: '/trips', label: 'Viagens', icon: '🗺️' },
  { to: '/settings', label: 'Config', icon: '⚙️' },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400 shrink-0">
          <span className="text-lg">✈️</span>
          <span className="text-lg hidden sm:inline">SkyAgent</span>
        </Link>

        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className={`relative px-2.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                }`}
              >
                {isActive && (
                  <span className="absolute inset-x-1 -bottom-[11px] h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
                <span className="mr-0.5">{item.icon}</span>
                <span className="hidden md:inline ml-0.5">{item.label}</span>
              </Link>
            );
          })}
          <div className="ml-1 border-l border-gray-200 dark:border-gray-700 pl-1">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
