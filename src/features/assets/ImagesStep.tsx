import { useEffect, useRef, useState } from 'react';
import { de } from '../../i18n/de';
import {
  addImageFiles,
  moveImage,
  removeImage,
  reorderImages,
  restoreImage,
} from '../../store/assetActions';
import { useProjectStore } from '../../store/projectStore';
import type { AssetFile } from '../../types/project';
import type { AssetReject } from '../../utils/assetMedia';
import styles from './assets.module.css';
import { AssetMeta } from './AssetMeta';
import { Dropzone } from './Dropzone';
import { useAssetDbAvailable } from './useAssetDbAvailable';
import { useAssetObjectUrl } from './useAssetObjectUrl';

function rejectText(reason: AssetReject['reason']): string {
  if (reason === 'unsupported') return de.assets.unsupported;
  if (reason === 'too-large') return de.assets.tooLarge;
  if (reason === 'quota') return de.assets.quota;
  return de.assets.readError;
}

const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';
const UNDO_MS = 5000;
const DRAG_TYPE = 'application/x-lps-image-index';

interface UndoState {
  asset: AssetFile;
  blob: Blob;
  index: number;
}

function ImageCard({
  asset,
  index,
  isLast,
  onDelete,
  onMove,
  onReorder,
}: {
  asset: AssetFile;
  index: number;
  isLast: boolean;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const url = useAssetObjectUrl(asset.blobKey);
  const [dragging, setDragging] = useState(false);

  return (
    <article
      className={`${styles.card}${dragging ? ` ${styles.dragging}` : ''}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(DRAG_TYPE, String(index));
        event.dataTransfer.setData('text/plain', String(index));
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        const raw =
          event.dataTransfer.getData(DRAG_TYPE) ||
          event.dataTransfer.getData('text/plain');
        const from = Number.parseInt(raw, 10);
        if (!Number.isFinite(from)) return;
        onReorder(from, index);
      }}
    >
      <div className={styles.cardHead}>
        <p className={styles.id}>{asset.id}</p>
        <button
          type="button"
          className="btn btn-tertiary"
          aria-label={`${de.wizard.remove}: ${asset.name}`}
          onClick={() => onDelete(asset.id)}
        >
          {de.wizard.remove}
        </button>
      </div>
      <div className={styles.thumbWrap}>
        {url ? (
          <img className={styles.thumb} src={url} alt={asset.name} />
        ) : (
          <p className={styles.missing}>{de.assets.missingBlob}</p>
        )}
      </div>
      <AssetMeta asset={asset} />
      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-tertiary"
          aria-label={de.assets.moveUp}
          disabled={index === 0}
          onClick={() => onMove(asset.id, -1)}
        >
          {de.assets.moveUp}
        </button>
        <button
          type="button"
          className="btn btn-tertiary"
          aria-label={de.assets.moveDown}
          disabled={isLast}
          onClick={() => onMove(asset.id, 1)}
        >
          {de.assets.moveDown}
        </button>
      </div>
    </article>
  );
}

export function ImagesStep() {
  const images = useProjectStore((state) => state.project?.media.images ?? []);
  const [errors, setErrors] = useState<AssetReject[]>([]);
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dbOk = useAssetDbAvailable();

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, []);

  async function ingest(files: File[]): Promise<void> {
    setBusy(true);
    const rejected = await addImageFiles(files);
    setErrors(rejected);
    setBusy(false);
  }

  async function onDelete(id: string): Promise<void> {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    setUndo(null);
    const snapshot = await removeImage(id);
    if (!snapshot) return;
    setUndo(snapshot);
    undoTimer.current = setTimeout(() => {
      setUndo(null);
      undoTimer.current = null;
    }, UNDO_MS);
  }

  async function onUndo(): Promise<void> {
    if (!undo) return;
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    await restoreImage(undo.asset, undo.blob, undo.index);
    setUndo(null);
  }

  return (
    <div className={styles.stack}>
      {images.length === 0 ? (
        <Dropzone
          title={de.assets.dropTitleImages}
          hint={de.assets.dropHint}
          formats={de.assets.dropFormatsImages}
          browse={de.assets.browse}
          accept={IMAGE_ACCEPT}
          multiple
          disabled={busy || !dbOk}
          primary
          onFiles={(files) => void ingest(files)}
        />
      ) : (
        <>
          <div className={styles.grid}>
            {images.map((asset, index) => (
              <ImageCard
                key={asset.blobKey}
                asset={asset}
                index={index}
                isLast={index === images.length - 1}
                onDelete={(id) => void onDelete(id)}
                onMove={moveImage}
                onReorder={reorderImages}
              />
            ))}
          </div>
          <Dropzone
            title={de.assets.addMoreImages}
            hint={de.assets.dropHint}
            formats={de.assets.dropFormatsImages}
            browse={de.assets.browse}
            accept={IMAGE_ACCEPT}
            multiple
            disabled={busy || !dbOk}
            compact
            onFiles={(files) => void ingest(files)}
          />
        </>
      )}

      {errors.length > 0 ? (
        <ul className={styles.errors} role="alert">
          {errors.map((item) => (
            <li key={`${item.name}-${item.reason}`}>
              {item.name}: {rejectText(item.reason)}
            </li>
          ))}
        </ul>
      ) : null}

      {!dbOk ? (
        <p className={styles.failed} role="status">
          {de.assetDbUnavailable}
        </p>
      ) : null}

      {undo ? (
        <div className={styles.toast} role="status">
          <p>{de.assets.imageRemoved}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void onUndo()}
          >
            {de.assets.undo}
          </button>
        </div>
      ) : null}
    </div>
  );
}
