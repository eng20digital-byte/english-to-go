import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { RequireAuth } from '@/auth/RequireAuth';
import { LoginPage } from '@/admin/LoginPage';
import { AdminRoutes } from '@/admin/routes';
import { ReaderBookletPage } from '@/reader/ReaderBookletPage';
import { TooltipProvider } from '@/components/ui/tooltip';

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <AuthProvider>
          <Routes>
            <Route path="/admin/login" element={<LoginPage />} />
            <Route
              path="/admin/*"
              element={
                <RequireAuth>
                  <AdminRoutes />
                </RequireAuth>
              }
            />
            <Route path="/b/:token" element={<ReaderBookletPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
