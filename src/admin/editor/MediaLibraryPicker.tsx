import { useRef, useState, type ChangeEvent } from 'react';
import { CheckCircle, ImageIcon, Search, Trash2 } from 'lucide-react';
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
import { AdminPageShell } from '@/admin/shell/AdminPageShell';
import { AdminPageHeader } from '@/admin/shell/AdminPageHeader';
import { EmptyState } from '@/admin/shell/EmptyState';

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
  const [searchQuery, setSearchQuery] = useState('');

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

  const trimmed = searchQuery.trim().toLowerCase();
  const filteredAssets = trimmed
    ? (assets ?? []).filter((a) => a.file_name.toLowerCase().includes(trimmed))
    : (assets ?? []);

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

      {/* ── Search bar ── */}
      {!isLoading && (assets?.length ?? 0) > 0 && (
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search
            size={15}
            color={BRAND.textMuted}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="search"
            placeholder="Search by file name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 14px 10px 38px',
              borderRadius: 12,
              border: `1.5px solid rgba(89,178,146,0.3)`,
              backgroundColor: BRAND.cream,
              fontSize: 14,
              fontWeight: 500,
              color: BRAND.text,
              outline: 'none',
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            }}
          />
        </div>
      )}

      {isLoading && <MediaGridSkeleton />}
      {!isLoading && assets?.length === 0 && (
        <EmptyState
          accent="green"
          icon={<ImageIcon size={24} color={BRAND.green} />}
          title="No images uploaded yet"
          subtitle="Upload an image using the zone above."
          padding={embedded ? '40px 24px' : '60px 24px'}
        />
      )}
      {!isLoading && (assets?.length ?? 0) > 0 && filteredAssets.length === 0 && (
        <p style={{ textAlign: 'center', color: BRAND.textMuted, fontSize: 14, fontWeight: 500, margin: '24px 0' }}>
          No images match "{searchQuery.trim()}"
        </p>
      )}

      {/* ── Image gallery — printed photos on a paper desk ── */}
      {filteredAssets.length > 0 && (
        <ul style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 20,
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}>
          {filteredAssets.map((asset, index) => {
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
    <AdminPageShell variant="media">
      <AdminPageHeader
        accent="green"
        icon={<ImageIcon size={24} color="#fff" />}
        title="Media Library"
        subtitle="Images shared across all booklets. Unused images can be safely deleted."
      />
      {content}
    </AdminPageShell>
  );
}
