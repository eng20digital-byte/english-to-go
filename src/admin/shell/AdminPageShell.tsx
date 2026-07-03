import { type CSSProperties, type ReactNode } from 'react';
import { BRAND } from '@/config/theme';
import { ADMIN_FONT, ADMIN_PAGE_PADDING } from './adminControls';
import { AdminBackgroundShapes, type AdminBgVariant } from './AdminBackgroundShapes';

// The shared admin page shell: `#admin-root` + brand-green backdrop + the
// decorative background shapes + the centered content container. Replaces the
// wrapper that was copy-pasted across every admin page.
interface AdminPageShellProps {
  variant: AdminBgVariant;
  children: ReactNode;
  // Login: flex-center the children (its own 440px card) with no padded
  // content container.
  center?: boolean;
  // Dashboard hub only: pass `stacked`. Wide screens stay a fixed
  // non-scrolling hub (height 100vh, clipped); once the action cards stack the
  // content outgrows the viewport, so switch to min-height + vertical scroll.
  hubScroll?: boolean;
  // Fixed bottom-left slot (the credits panel on login/dashboard).
  footer?: ReactNode;
}

const CONTENT_STYLE: CSSProperties = {
  position: 'relative',
  zIndex: 10,
  maxWidth: 900,
  margin: '0 auto',
};

const FOOTER_STYLE: CSSProperties = {
  position: 'fixed',
  left: 0,
  bottom: 24,
  zIndex: 20,
  display: 'flex',
};

export function AdminPageShell({
  variant,
  children,
  center,
  hubScroll,
  footer,
}: AdminPageShellProps) {
  const rootStyle: CSSProperties = {
    backgroundColor: BRAND.green,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: ADMIN_FONT,
    ...(center
      ? {
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }
      : hubScroll !== undefined
        ? {
            height: hubScroll ? 'auto' : '100vh',
            minHeight: hubScroll ? '100vh' : undefined,
            overflow: hubScroll ? 'hidden auto' : 'hidden',
            padding: ADMIN_PAGE_PADDING,
          }
        : { minHeight: '100vh', padding: ADMIN_PAGE_PADDING }),
  };

  return (
    <div id="admin-root" style={rootStyle}>
      <AdminBackgroundShapes variant={variant} />
      {center ? children : <div style={CONTENT_STYLE}>{children}</div>}
      {footer && <div style={FOOTER_STYLE}>{footer}</div>}
    </div>
  );
}
