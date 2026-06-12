import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { FullPageLoader } from './Loaders.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!user) {
    // Allow demo access — even without auth, send to dashboard via /login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
