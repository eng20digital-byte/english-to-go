import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { RequireAuth } from '@/auth/RequireAuth';
import { LoginPage } from '@/admin/LoginPage';
import { AdminRoutes } from '@/admin/routes';
import { ReaderBookletPage } from '@/reader/ReaderBookletPage';
import { CanvasPreviewPage } from '@/dev/CanvasPreviewPage';

function App() {
  return (
    <BrowserRouter>
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
          {/* M4 throwaway harness — delete once M5 ships a real reader to verify against. */}
          <Route path="/dev/canvas-preview" element={<CanvasPreviewPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
