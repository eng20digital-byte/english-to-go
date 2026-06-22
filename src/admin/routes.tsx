import { Route, Routes } from 'react-router-dom';
import { DashboardPage } from '@/admin/DashboardPage';
import { FontManagerPage } from '@/admin/fonts/FontManagerPage';

// Nested under the /admin/* route in App.tsx, inside RequireAuth.
export function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/fonts" element={<FontManagerPage />} />
    </Routes>
  );
}
