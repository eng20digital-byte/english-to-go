import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { useUpdateBookletQuizMutation } from '@/hooks/useBookletQuery';
import { DEFAULT_QUIZ_EMBED_HEIGHT } from '@/config/quiz';
import type { BookletRow } from '@/types/database';

interface QuizEmbedEditorProps {
  booklet: BookletRow;
}

// Booklet-level settings (not per-page) for the Fillout snippet rendered, via
// QuizEmbed, on whichever page has is_quiz_page = true — see CLAUDE.md "Quiz
// embed (final page)". Explicit Save rather than autosave: these two fields
// change rarely, unlike the continuous drag/type edits page_elements gets.
//
// No effect resyncing local state from `booklet` on change: BookletEditorPage
// only renders this once `booklet` has loaded and unmounts it while loading a
// different one (see its isLoading early return), so a fresh mount — and
// therefore fresh useState initializers — is what naturally happens when the
// underlying booklet actually changes.
export function QuizEmbedEditor({ booklet }: QuizEmbedEditorProps) {
  const updateQuiz = useUpdateBookletQuizMutation(booklet.id);
  const [embedCode, setEmbedCode] = useState(booklet.quiz_embed_code ?? '');
  const [height, setHeight] = useState(booklet.quiz_embed_height ?? DEFAULT_QUIZ_EMBED_HEIGHT);

  const isDirty =
    embedCode !== (booklet.quiz_embed_code ?? '') ||
    height !== (booklet.quiz_embed_height ?? DEFAULT_QUIZ_EMBED_HEIGHT);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuiz.mutate({
      quizEmbedCode: embedCode.trim() === '' ? null : embedCode,
      quizEmbedHeight: height,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 flex max-w-xl flex-col gap-3 rounded-md border border-input p-4"
    >
      <h2 className="text-lg font-semibold">Quiz embed</h2>
      <p className="text-xs text-muted-foreground">
        Paste the raw Fillout embed snippet here. It renders on whichever page below is marked
        "Quiz page", in place of the canvas.
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Embed snippet</span>
        <textarea
          value={embedCode}
          onChange={(event) => setEmbedCode(event.target.value)}
          rows={6}
          placeholder="<script ...></script><button ...>Open quiz</button>"
          className="rounded-md border border-input px-3 py-2 font-mono text-xs"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Embed height (px, for inline-style embeds)</span>
        <input
          type="number"
          min={1}
          value={height}
          onChange={(event) => setHeight(Number(event.target.value))}
          className="w-32 rounded-md border border-input px-3 py-2"
        />
      </label>
      <Button type="submit" disabled={!isDirty || updateQuiz.isPending} className="self-start">
        {updateQuiz.isPending ? 'Saving…' : 'Save quiz embed'}
      </Button>
      {updateQuiz.isError && (
        <p className="text-sm text-destructive">Failed to save. Please try again.</p>
      )}
    </form>
  );
}
