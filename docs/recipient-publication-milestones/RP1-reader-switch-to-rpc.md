# RP1 — Reader Switches to the RPC

**Goal:** Route the public reader through `get_booklet_by_token` instead of the
RLS nested-select, so per-recipient links resolve. Existing master links must keep
rendering identically.

**Risk:** medium — touches the single reader data path, but the RPC returns the
same shape and the fallback branch preserves master-link behavior.

## Scope

- `src/hooks/useBookletQuery.ts` — rewrite `useBookletByToken` (lines 54-92).
- `src/types/database.ts` — add recipient types (used from RP2 on; added here so
  the DB shape is documented in one place).

## Change shape

### `useBookletByToken`

Replace the `.from('booklets').select(...).eq('public_token', token)` call with:

```ts
const { data, error } = await supabase.rpc('get_booklet_by_token', { p_token: token });
if (error) throw error;
if (!data) return null;
// data is the nested jsonb the RPC built — map to ReaderBooklet exactly as before
```

- The mapping from the returned JSON to `ReaderBooklet` (`BookletQueryRow` →
  pages → elements) stays structurally identical; only the fetch call changes.
- Keep `null → return null` so the reader's existing not-found handling
  (`ReaderBookletPage.tsx:168`) is unchanged.
- `queryKey: ['booklet', token]` unchanged.

### Types (`src/types/database.ts`)

```ts
export type RecipientStatus = 'published' | 'unpublished';

export interface BookletRecipientRow {
  id: string;
  booklet_id: string;
  name: string;
  access_token: string;
  status: RecipientStatus;
  expires_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
```

## Verification

1. Every existing published booklet's master link `/b/:public_token` renders
   exactly as before (cover, pages, TTS, quiz — spot-check one full booklet).
2. A `disabled`/`draft` booklet's master link still shows the generic not-found.
3. Insert (via SQL) a `published` recipient row for a booklet, open
   `/b/:access_token` → renders the booklet.
4. `npm run lint` + typecheck green.

## Out of scope

- No admin UI yet (recipients are still managed by raw SQL until RP2/RP3).
- No expiry UI (the RPC already enforces expiry server-side; UI lands in RP4).
