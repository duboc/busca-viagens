import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useTheme } from '../../hooks/useTheme';

export default function Layout() {
  // Apply dark class to <html> and listen for system preference changes
  useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
