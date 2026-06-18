import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import AutopsyAnalyzer from './pages/AutopsyAnalyzer';
import TODEstimation from './pages/TODEstimation';
import TimelineEvidence from './pages/TimelineEvidence';
import CrimeSceneMap from './pages/CrimeSceneMap';
import RiskAnomalies from './pages/RiskAnomalies';
import ImageAnalysis from './pages/ImageAnalysis';
import AIAssistant from './pages/AIAssistant';
import Explainability from './pages/Explainability';
import EvidenceLocker from './pages/EvidenceLocker';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="cases" element={<Cases />} />
        <Route path="cases/:id" element={<CaseDetail />} />
        <Route path="autopsy" element={<AutopsyAnalyzer />} />
        <Route path="tod" element={<TODEstimation />} />
        <Route path="timeline" element={<TimelineEvidence />} />
        <Route path="map" element={<CrimeSceneMap />} />
        <Route path="risk" element={<RiskAnomalies />} />
        <Route path="images" element={<ImageAnalysis />} />
        <Route path="assistant" element={<AIAssistant />} />
        <Route path="evidence" element={<EvidenceLocker />} />
        <Route path="explain" element={<Explainability />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
