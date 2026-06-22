import { Route, Routes } from 'react-router-dom';
import { DashboardPage } from '@/admin/DashboardPage';
import { BookletListPage } from '@/admin/BookletListPage';
import { BookletEditorPage } from '@/admin/BookletEditorPage';
import { FontManagerPage } from '@/admin/fonts/FontManagerPage';
import { MediaLibraryPicker } from '@/admin/editor/MediaLibraryPicker';

// Nested under the /admin/* route in App.tsx, inside RequireAuth.
export function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/booklets" element={<BookletListPage />} />
      <Route path="/booklets/:bookletId" element={<BookletEditorPage />} />
      {/* M8 mounts the real per-page editor at this nested route; M7 renders
          BookletEditorPage's placeholder panel for it (see CLAUDE.md M8 scope:
          "Per-page editor route nested under the booklet shell"). */}
      <Route path="/booklets/:bookletId/pages/:pageId" element={<BookletEditorPage />} />
      <Route path="/fonts" element={<FontManagerPage />} />
      <Route path="/media" element={<MediaLibraryPicker />} />
    </Routes>
  );
}
