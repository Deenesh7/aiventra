import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import TopBar from '../components/TopBar.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

export default function AppShell() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen bg-ink-950">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
          {/* key forces a fresh boundary per route — so crashes don't get sticky */}
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
