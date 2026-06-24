import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUpdateBookletQuizMutation } from '@/hooks/useBookletQuery';
import { DEFAULT_QUIZ_EMBED_HEIGHT } from '@/config/quiz';
import type { BookletRow } from '@/types/database';

interface QuizEmbedEditorProps {
  booklet: BookletRow;
}

const inputCls =
  'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

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

  function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    updateQuiz.mutate({
      quizEmbedCode: embedCode.trim() === '' ? null : embedCode,
      quizEmbedHeight: height,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quiz embed</CardTitle>
        <CardDescription className="text-xs">
          Paste the raw Fillout embed snippet here. It renders on whichever page is marked "Quiz
          page", in place of the canvas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Embed snippet</span>
            <textarea
              value={embedCode}
              onChange={(event) => setEmbedCode(event.target.value)}
              rows={6}
              placeholder={'<script ...></script>\n<button ...>Open quiz</button>'}
              className={`${inputCls} resize-y font-mono text-xs`}
            />
          </label>

          <div className="flex items-end gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Embed height (px)</span>
              <input
                type="number"
                min={1}
                value={height}
                onChange={(event) => setHeight(Number(event.target.value))}
                className={`${inputCls} w-28`}
              />
            </label>
            <Button type="submit" disabled={!isDirty || updateQuiz.isPending}>
              {updateQuiz.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>

          {updateQuiz.isError && (
            <p className="text-sm text-destructive">Failed to save. Please try again.</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
