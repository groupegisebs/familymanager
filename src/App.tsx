import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { Dashboard } from './pages/Dashboard';
import { FamilyPage } from './pages/Family';
import { MemberPage } from './pages/MemberPage';
import { CalendarPage } from './pages/CalendarPage';
import { Finances } from './pages/Finances';
import { DocumentsPage } from './pages/DocumentsPage';
import { SettingsPage } from './pages/SettingsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="famille" element={<FamilyPage />} />
        <Route path="famille/:id" element={<MemberPage />} />
        <Route path="calendrier" element={<CalendarPage />} />
        <Route path="finances" element={<Navigate to="/finances/budget" replace />} />
        <Route path="finances/:section" element={<Finances />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="parametres" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
