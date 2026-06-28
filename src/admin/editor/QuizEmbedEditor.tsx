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

// Booklet-level quiz settings. "Show on last spread" is stored on the booklet
// (show_quiz_on_last_spread) so it is unaffected by adding/removing the back
// cover — the quiz always lands on the last non-cover, non-back-cover page.
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
  const [showOnLastSpread, setShowOnLastSpread] = useState(booklet.show_quiz_on_last_spread);

  const isDirty =
    embedCode !== (booklet.quiz_embed_code ?? '') ||
    height !== (booklet.quiz_embed_height ?? DEFAULT_QUIZ_EMBED_HEIGHT) ||
    showOnLastSpread !== booklet.show_quiz_on_last_spread;

  function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    updateQuiz.mutate({
      quizEmbedCode: embedCode.trim() === '' ? null : embedCode,
      quizEmbedHeight: height,
      showQuizOnLastSpread: showOnLastSpread,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quiz embed</CardTitle>
        <CardDescription className="text-xs">
          Paste the raw Fillout embed snippet here. It renders on the last open spread (not the
          back cover) when "Show on last spread" is checked.
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

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnLastSpread}
              onChange={(e) => setShowOnLastSpread(e.target.checked)}
            />
            <span>Show quiz on last spread</span>
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
