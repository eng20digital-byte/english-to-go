import { useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, ImageIcon, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/Spinner';
import { supabase } from '@/lib/supabaseClient';
import { MEDIA_STORAGE_BUCKET, MEDIA_ACCEPTED_FILE_TYPES } from '@/config/media';
import {
  useMediaAssetsQuery,
  useUploadMediaAssetMutation,
  useDeleteMediaAssetMutation,
} from '@/hooks/useMediaLibraryQuery';
import type { MediaAssetRow } from '@/types/database';
import { BRAND } from '@/config/theme';

interface MediaLibraryPickerProps {
  // When provided, renders a "Select" affordance per image and omits the
  // standalone screen's back-link/heading — M8's "Add background image"
  // embeds this same component (M6's admin screen) inside a modal instead
  // of forking a second picker UI.
  onSelect?: (asset: MediaAssetRow) => void;
}

function MediaGridSkeleton() {
  return (
    <ul style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: 20,
      listStyle: 'none',
      margin: 0,
      padding: 0,
    }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} style={{
          backgroundColor: BRAND.cream,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '6px 8px 0 rgba(0,0,0,0.07), 0 4px 10px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            aspectRatio: '1',
            backgroundColor: 'rgba(89,178,146,0.12)',
            animation: 'sk-pulse 1.5s ease-in-out infinite',
          }} />
          <div style={{ padding: '10px 14px 12px' }}>
            <div style={{
              height: 10,
              width: '60%',
              borderRadius: 5,
              backgroundColor: 'rgba(26,26,26,0.09)',
              animation: 'sk-pulse 1.5s ease-in-out infinite',
            }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyMedia({ embedded }: { embedded: boolean }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      padding: embedded ? '40px 24px' : '60px 24px',
      backgroundColor: BRAND.cream,
      borderRadius: 24,
      border: '2px dashed rgba(89,178,146,0.4)',
      textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        backgroundColor: 'rgba(89,178,146,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ImageIcon size={24} color={BRAND.green} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: BRAND.text }}>
          No images uploaded yet
        </p>
        <p style={{ margin: '5px 0 0', fontSize: 14, color: BRAND.textMuted }}>
          Upload an image using the zone above.
        </p>
      </div>
    </div>
  );
}

export function MediaLibraryPicker({ onSelect }: MediaLibraryPickerProps = {}) {
  const { data: assets, isLoading } = useMediaAssetsQuery();
  const uploadAsset = useUploadMediaAssetMutation();
  const deleteAsset = useDeleteMediaAssetMutation();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const embedded = !!onSelect;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dropZoneHover, setDropZoneHover] = useState(false);
  const [backLinkHover, setBackLinkHover] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadError(null);
    try {
      await uploadAsset.mutateAsync(file);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image.');
    }
  }

  async function handleDelete(asset: MediaAssetRow) {
    setDeleteErrors((prev) => ({ ...prev, [asset.id]: '' }));
    try {
      await deleteAsset.mutateAsync(asset);
    } catch (error) {
      setDeleteErrors((prev) => ({
        ...prev,
        [asset.id]: error instanceof Error ? error.message : 'Failed to delete image.',
      }));
    }
  }

  const content = (
    <>
      {/* ── Upload drop zone — a blank cream paper sheet waiting for content ── */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadAsset.isPending}
        onMouseEnter={() => setDropZoneHover(true)}
        onMouseLeave={() => setDropZoneHover(false)}
        style={{
          width: '100%',
          backgroundColor: BRAND.cream,
          border: `2px dashed ${dropZoneHover && !uploadAsset.isPending ? BRAND.green : 'rgba(89,178,146,0.4)'}`,
          borderRadius: 24,
          padding: embedded ? '32px 24px' : '52px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          cursor: uploadAsset.isPending ? 'not-allowed' : 'pointer',
          opacity: uploadAsset.isPending ? 0.7 : 1,
          boxShadow: dropZoneHover && !uploadAsset.isPending
            ? '0 10px 28px rgba(0,0,0,0.13), 0 3px 8px rgba(0,0,0,0.08)'
            : '0 4px 14px rgba(0,0,0,0.09)',
          transform: dropZoneHover && !uploadAsset.isPending ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
          marginBottom: 28,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={MEDIA_ACCEPTED_FILE_TYPES}
          onChange={handleFileChange}
          disabled={uploadAsset.isPending}
          style={{ display: 'none' }}
          tabIndex={-1}
        />
        {uploadAsset.isPending ? (
          <Spinner size="sm" />
        ) : (
          <div style={{
            width: 58, height: 58, borderRadius: '50%',
            backgroundColor: BRAND.green,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: dropZoneHover ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.2s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <ImageIcon size={24} color="#fff" />
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: BRAND.text }}>
            {uploadAsset.isPending ? 'Uploading…' : 'Click to upload an image'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: BRAND.textMuted, fontWeight: 500 }}>
            JPG, PNG, WebP, GIF
          </p>
        </div>
      </button>

      {/* Upload error */}
      {uploadError && (
        <p style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 600, color: BRAND.pink }}>
          {uploadError}
        </p>
      )}

      {isLoading && <MediaGridSkeleton />}
      {!isLoading && assets?.length === 0 && <EmptyMedia embedded={embedded} />}

      {/* ── Image gallery — printed photos on a paper desk ── */}
      {assets && assets.length > 0 && (
        <ul style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 20,
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}>
          {assets.map((asset, index) => {
            const {
              data: { publicUrl },
            } = supabase.storage.from(MEDIA_STORAGE_BUCKET).getPublicUrl(asset.storage_path);
            const hovered = hoveredId === asset.id;
            // Alternate rotation direction — scattered-photos-on-desk effect
            const rotationDeg = index % 2 === 0 ? '-1.5' : '1.5';

            return (
              <li
                key={asset.id}
                onMouseEnter={() => setHoveredId(asset.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  position: 'relative',
                  backgroundColor: BRAND.cream,
                  borderRadius: 20,
                  overflow: 'hidden',
                  boxShadow: hovered
                    ? `10px 14px 0 rgba(0,0,0,0.1), 0 18px 44px rgba(0,0,0,0.17)`
                    : `6px 8px 0 rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.1)`,
                  transform: hovered
                    ? `translateY(-8px) rotate(${rotationDeg}deg)`
                    : 'translateY(0) rotate(0deg)',
                  transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                  cursor: onSelect ? 'pointer' : 'default',
                }}
              >
                {/* Image */}
                <div style={{ aspectRatio: '1', overflow: 'hidden' }}>
                  <img
                    src={publicUrl}
                    alt={asset.file_name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transform: hovered ? 'scale(1.06)' : 'scale(1)',
                      transition: 'transform 0.22s ease',
                    }}
                  />
                </div>

                {/* Hover overlay with action buttons */}
                <div style={{
                  position: 'absolute',
                  top: 0, right: 0, bottom: 0, left: 0,
                  backgroundColor: 'rgba(0,0,0,0.52)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  opacity: hovered ? 1 : 0,
                  transition: 'opacity 0.18s ease',
                }}>
                  {onSelect && (
                    <button
                      type="button"
                      onClick={() => onSelect(asset)}
                      aria-label={`Select ${asset.file_name}`}
                      style={{
                        width: 42, height: 42,
                        borderRadius: '50%',
                        backgroundColor: BRAND.yellow,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
                        fontFamily: 'inherit',
                      }}
                    >
                      <CheckCircle size={18} color={BRAND.text} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(asset)}
                    disabled={deleteAsset.isPending}
                    aria-label={`Delete ${asset.file_name}`}
                    style={{
                      width: 42, height: 42,
                      borderRadius: '50%',
                      backgroundColor: BRAND.pink,
                      border: 'none',
                      cursor: deleteAsset.isPending ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
                      opacity: deleteAsset.isPending ? 0.5 : 1,
                      fontFamily: 'inherit',
                    }}
                  >
                    <Trash2 size={18} color="#fff" />
                  </button>
                </div>

                {/* Filename */}
                <div style={{ padding: '10px 14px 12px' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 500,
                      color: BRAND.textMuted,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={asset.file_name}
                  >
                    {asset.file_name}
                  </p>
                  {deleteErrors[asset.id] && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: BRAND.pink, fontWeight: 600 }}>
                      {deleteErrors[asset.id]}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  // Embedded mode — rendered inside the editor's modal, no page chrome needed
  if (embedded) {
    return content;
  }

  // Standalone page at /admin/media
  return (
    <div
      id="admin-root"
      style={{
        minHeight: '100vh',
        backgroundColor: BRAND.green,
        position: 'relative',
        overflow: 'hidden',
        padding: '28px 32px 64px',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      {/* ── Background geometric shapes (same visual language as login + dashboard) ── */}

      {/* Large yellow circle — top-left corner */}
      <div style={{
        position: 'absolute', top: -120, left: -140,
        width: 400, height: 400, borderRadius: '50%',
        backgroundColor: BRAND.yellow,
        boxShadow: '10px 12px 0 rgba(0,0,0,0.09)',
        pointerEvents: 'none',
      }} />

      {/* Pink rounded rectangle — top-right, angled */}
      <div style={{
        position: 'absolute', top: -60, right: -80,
        width: 300, height: 280, borderRadius: 50,
        backgroundColor: BRAND.pink,
        transform: 'rotate(18deg)',
        boxShadow: '-8px 10px 0 rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }} />

      {/* Cream circle — bottom-left */}
      <div style={{
        position: 'absolute', bottom: -70, left: -60,
        width: 240, height: 240, borderRadius: '50%',
        backgroundColor: BRAND.cream, opacity: 0.55,
        boxShadow: '8px 6px 0 rgba(0,0,0,0.06)',
        pointerEvents: 'none',
      }} />

      {/* Yellow tall pill — mid-right, half off-screen */}
      <div style={{
        position: 'absolute', top: '30%', right: -65,
        width: 120, height: 280, borderRadius: 60,
        backgroundColor: BRAND.yellow, opacity: 0.55,
        transform: 'rotate(-20deg)',
        pointerEvents: 'none',
      }} />

      {/* Pink shape — bottom-right accent */}
      <div style={{
        position: 'absolute', bottom: -70, right: '10%',
        width: 200, height: 180, borderRadius: 40,
        backgroundColor: BRAND.pink, opacity: 0.35,
        transform: 'rotate(8deg)',
        pointerEvents: 'none',
      }} />

      {/* Cream small circle — mid-left */}
      <div style={{
        position: 'absolute', top: '45%', left: -40,
        width: 120, height: 120, borderRadius: '50%',
        backgroundColor: BRAND.cream, opacity: 0.4,
        pointerEvents: 'none',
      }} />

      {/* ── Page content ── */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto' }}>

        {/* ── Floating header card ── */}
        <header style={{
          backgroundColor: BRAND.cream,
          borderRadius: 20,
          padding: '24px 32px 28px',
          marginBottom: 28,
          boxShadow: '0 8px 28px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
        }}>
          <Link
            to="/admin"
            onMouseEnter={() => setBackLinkHover(true)}
            onMouseLeave={() => setBackLinkHover(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 14px 7px 10px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              color: backLinkHover ? BRAND.text : BRAND.green,
              backgroundColor: backLinkHover ? 'rgba(89,178,146,0.14)' : 'rgba(89,178,146,0.08)',
              border: `1.5px solid ${backLinkHover ? 'rgba(89,178,146,0.4)' : 'rgba(89,178,146,0.2)'}`,
              textDecoration: 'none',
              marginBottom: 20,
              transition: 'all 0.15s',
            }}
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                color: BRAND.text,
                letterSpacing: '-0.4px',
                fontFamily: 'inherit',
              }}>
                Media Library
              </h1>
              <p style={{
                margin: '7px 0 0',
                fontSize: 14,
                color: BRAND.textMuted,
                fontWeight: 500,
                lineHeight: 1.5,
              }}>
                Images shared across all booklets. Unused images can be safely deleted.
              </p>
            </div>
            {/* Icon badge */}
            <div style={{
              width: 52, height: 52,
              borderRadius: 16,
              backgroundColor: BRAND.green,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              marginLeft: 20,
              boxShadow: '4px 4px 0 rgba(0,0,0,0.1)',
            }}>
              <ImageIcon size={24} color="#fff" />
            </div>
          </div>
        </header>

        {content}
      </div>
    </div>
  );
}
