import { useParams } from 'react-router-dom';

// Placeholder for M2 — replaced by the real reader in M5. No Tailwind/admin
// chrome here: this route is the public reader, outside the admin scope.
export function ReaderBookletPage() {
  const { token } = useParams<{ token: string }>();

  return (
    <div>
      <p>Booklet here (token: {token})</p>
    </div>
  );
}
