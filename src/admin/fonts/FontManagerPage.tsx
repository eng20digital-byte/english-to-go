import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import { FONT_WEIGHTS, type FontWeight } from '@/config/fonts';
import { useFontsQuery, useRegisterFontMutation } from '@/hooks/useFontsQuery';
import { FontPreview } from './FontPreview';

function EmptyFonts() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
        <Type className="h-5 w-5 text-neutral-400" />
      </div>
      <div>
        <p className="font-medium text-neutral-700">No fonts registered yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a .woff2 file using the form above.
        </p>
      </div>
    </div>
  );
}

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
      <h1 className="mt-2 mb-6 text-xl font-semibold">Font Manager</h1>

      <form onSubmit={handleSubmit} className="mb-8 flex max-w-sm flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Andika New Basic"
            required
            className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Weight</span>
          <select
            value={weight}
            onChange={(event) => setWeight(event.target.value as FontWeight)}
            className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {FONT_WEIGHTS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">WOFF2 file</span>
          <input
            type="file"
            accept=".woff2"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
            className="rounded-md border border-input px-3 py-2 text-sm"
          />
        </label>
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <Button type="submit" disabled={registerFont.isPending} className="self-start">
          {registerFont.isPending ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" className="text-primary-foreground" />
              Uploading…
            </span>
          ) : (
            'Register font'
          )}
        </Button>
      </form>

      <h2 className="mb-4 text-lg font-semibold">Registered fonts</h2>

      {isLoading && (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Spinner size="sm" />
          <span>Loading fonts…</span>
        </div>
      )}

      {!isLoading && fonts?.length === 0 && <EmptyFonts />}

      <ul className="flex flex-col gap-4">
        {fonts?.map((font) => (
          <li
            key={font.id}
            className="rounded-md border border-input p-4 transition-shadow hover:shadow-sm"
          >
            <p className="mb-2 text-sm font-medium">
              {font.name} — {font.weight}
            </p>
            <FontPreview font={font} />
          </li>
        ))}
      </ul>
    </div>
  );
}
