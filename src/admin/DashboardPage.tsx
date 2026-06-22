import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

// Placeholder for M2 — replaced by the real booklet list in M7.
export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div id="admin-root" className="p-8">
      <h1 className="mb-4 text-xl font-semibold">Admin Dashboard</h1>
      <p className="mb-4">Signed in as {user?.email}</p>
      <nav className="mb-4">
        <Link to="/admin/fonts" className="text-sm underline">
          Font Manager
        </Link>
      </nav>
      <Button onClick={() => supabase.auth.signOut()}>Log out</Button>
    </div>
  );
}
