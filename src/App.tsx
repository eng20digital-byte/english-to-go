import { Button } from '@/components/ui/button';

function App() {
  return (
    <>
      {/* Admin chrome scope — Tailwind utilities and shadcn/ui components
          are active and scoped here (see src/index.css). Replaced with
          real routing in M2. */}
      <div id="admin-root">
        <Button>shadcn Button (inside #admin-root)</Button>
      </div>

      {/* Outside the admin scope — stands in for src/renderer/ output.
          Renders with plain browser default button styling, proving
          Tailwind preflight/utilities don't leak out here. */}
      <button>Plain button (outside #admin-root)</button>
    </>
  );
}

export default App;
