import type { BookletStatus } from '@/types/database';
import { cn } from '@/lib/utils';

// Distinguishes draft/published/disabled at a glance — `disabled` must read
// as visually distinct from `draft` even though both are publicly invisible
// (see CLAUDE.md "No draft/live content fork": draft = never been live,
// disabled = was live, intentionally revoked).
const STATUS_LABEL: Record<BookletStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  disabled: 'Disabled',
};

const STATUS_CLASSNAME: Record<BookletStatus, string> = {
  draft: 'bg-secondary text-secondary-foreground',
  published: 'bg-green-100 text-green-800',
  disabled: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: BookletStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_CLASSNAME[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
