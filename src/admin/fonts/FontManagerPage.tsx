import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FONT_WEIGHTS, type FontWeight } from '@/config/fonts';
import { useFontsQuery, useRegisterFontMutation } from '@/hooks/useFontsQuery';
import { FontPreview } from './FontPreview';

export function FontManagerPage() {
  const { data: fonts, isLoading } = useFontsQuery();
  const registerFont = useRegisterFontMutation();

  const [name, setName] = useState('');
  const [weight, setWeight] = useState<FontWeight>('regular');
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setFormError('Choose a .woff2 file to upload.');
      return;
    }
    setFormError(null);

    // Captured synchronously — React nulls out event.currentTarget once the
    // event has finished dispatching, which has already happened by the
    // time the await below resolves.
    const form = event.currentTarget;

    try {
      await registerFont.mutateAsync({ name, weight, file });
      form.reset();
      setName('');
      setWeight('regular');
      setFile(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to register font.');
    }
  }

  return (
    <div id="admin-root" className="p-8">
      <Link to="/admin" className="text-sm text-muted-foreground hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 mb-4 text-xl font-semibold">Font Manager</h1>

      <form onSubmit={handleSubmit} className="mb-8 flex max-w-sm flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Andika New Basic"
            required
            className="rounded-md border border-input px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Weight</span>
          <select
            value={weight}
            onChange={(event) => setWeight(event.target.value as FontWeight)}
            className="rounded-md border border-input px-3 py-2"
          >
            {FONT_WEIGHTS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span>WOFF2 file</span>
          <input
            type="file"
            accept=".woff2"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
            className="rounded-md border border-input px-3 py-2"
          />
        </label>
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <Button type="submit" disabled={registerFont.isPending}>
          {registerFont.isPending ? 'Uploading…' : 'Register font'}
        </Button>
      </form>

      <h2 className="mb-3 text-lg font-semibold">Registered fonts</h2>
      {isLoading && <p>Loading…</p>}
      {!isLoading && fonts?.length === 0 && (
        <p className="text-muted-foreground">No fonts registered yet.</p>
      )}
      <ul className="flex flex-col gap-4">
        {fonts?.map((font) => (
          <li key={font.id} className="rounded-md border border-input p-4">
            <p className="mb-1 text-sm font-medium">
              {font.name} — {font.weight}
            </p>
            <FontPreview font={font} />
          </li>
        ))}
      </ul>
    </div>
  );
}
