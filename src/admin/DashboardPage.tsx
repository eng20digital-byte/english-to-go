import { Link } from 'react-router-dom';
import { BookOpen, ImageIcon, Type, LogOut } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

interface NavCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function NavCard({ to, icon, title, description }: NavCardProps) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-3 rounded-xl border border-input p-5 transition-all hover:border-neutral-400 hover:shadow-sm"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
        {icon}
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

// Admin nav hub — booklets/fonts/media each get their own page rather than
// living here, so this stays a thin index rather than growing into a
// catch-all.
export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div id="admin-root" className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Signed in as {user?.email}</p>
      </div>

      <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
        <NavCard
          to="/admin/booklets"
          icon={<BookOpen className="h-5 w-5" />}
          title="Booklets"
          description="Create and publish digital booklets"
        />
        <NavCard
          to="/admin/fonts"
          icon={<Type className="h-5 w-5" />}
          title="Fonts"
          description="Upload and manage custom typefaces"
        />
        <NavCard
          to="/admin/media"
          icon={<ImageIcon className="h-5 w-5" />}
          title="Media"
          description="Upload background images"
        />
      </div>

      <div className="mt-10">
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
