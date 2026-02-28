import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/shared/Layout';
import ErrorBoundary from './components/shared/ErrorBoundary';
import SearchPage from './components/search/SearchPage';
import ResultsPage from './components/results/ResultsPage';
import HistoryPage from './components/history/HistoryPage';
import AlertsPage from './components/alerts/AlertsPage';
import SettingsPage from './components/settings/SettingsPage';
import AnalyticsPage from './components/analytics/AnalyticsPage';
import FareCalendarPage from './components/calendar/FareCalendarPage';
import TripsPage from './components/trips/TripsPage';
import TripDetailPage from './components/trips/TripDetailPage';
import AgentConsole from './components/agent/AgentConsole';
import LoadingSpinner from './components/shared/LoadingSpinner';
import { useDatabase } from './hooks/useDatabase';

function AppContent() {
  const { dbReady } = useDatabase();

  if (!dbReady) {
    return <LoadingSpinner size="lg" text="Inicializando SkyAgent..." />;
  }

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<SearchPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/calendar" element={<FareCalendarPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/trips/:tripId" element={<TripDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <AgentConsole />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
