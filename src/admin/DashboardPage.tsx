import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

// Admin nav hub — booklets/fonts/media each get their own page rather than
// living here, so this stays a thin index rather than growing into a
// catch-all.
export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div id="admin-root" className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Admin Dashboard</h1>
      <p className="mb-4">Signed in as {user?.email}</p>
      <nav className="mb-4 flex gap-4">
        <Link to="/admin/booklets" className="text-sm underline">
          Booklets
        </Link>
        <Link to="/admin/fonts" className="text-sm underline">
          Font Manager
        </Link>
        <Link to="/admin/media" className="text-sm underline">
          Media Library
        </Link>
      </nav>
      <Button onClick={() => supabase.auth.signOut()}>Log out</Button>
    </div>
  );
}
