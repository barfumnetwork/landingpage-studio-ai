import { useState } from 'react';
import { ConfirmDialog } from '../../app/shell/ConfirmDialog';
import { de } from '../../i18n/de';
import { addVideoFiles, removeVideo } from '../../store/assetActions';
import { useProjectStore } from '../../store/projectStore';
import type { AssetReject } from '../../utils/assetMedia';
import styles from './assets.module.css';
import { AssetMeta } from './AssetMeta';
import { Dropzone } from './Dropzone';
import { useAssetDbAvailable } from './useAssetDbAvailable';
import { VideoPreview } from './VideoPreview';

function rejectText(reason: AssetReject['reason']): string {
  if (reason === 'unsupported') return de.assets.unsupported;
  if (reason === 'too-large') return de.assets.tooLarge;
  if (reason === 'quota') return de.assets.quota;
  return de.assets.readError;
}

const VIDEO_ACCEPT = '.mp4,.webm,video/mp4,video/webm';

export function VideosStep() {
  const videos = useProjectStore((state) => state.project?.media.videos ?? []);
  const [errors, setErrors] = useState<AssetReject[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const dbOk = useAssetDbAvailable();

  async function ingest(files: File[]): Promise<void> {
    setBusy(true);
    const rejected = await addVideoFiles(files);
    setErrors(rejected);
    setBusy(false);
  }

  const pending = videos.find((item) => item.id === pendingId) ?? null;

  return (
    <div className={styles.stack}>
      {videos.length === 0 ? (
        <Dropzone
          title={de.assets.dropTitleVideos}
          hint={de.assets.dropHint}
          formats={de.assets.dropFormatsVideos}
          browse={de.assets.browse}
          accept={VIDEO_ACCEPT}
          multiple
          disabled={busy || !dbOk}
          primary
          onFiles={(files) => void ingest(files)}
        />
      ) : (
        <>
          <div className={styles.videoList}>
            {videos.map((asset) => (
              <article key={asset.blobKey} className={styles.card}>
                <div className={styles.cardHead}>
                  <p className={styles.id}>{asset.id}</p>
                  <button
                    type="button"
                    className="btn btn-tertiary"
                    aria-label={`${de.wizard.remove}: ${asset.name}`}
                    onClick={() => setPendingId(asset.id)}
                  >
                    {de.wizard.remove}
                  </button>
                </div>
                <VideoPreview asset={asset} />
                <AssetMeta asset={asset} />
              </article>
            ))}
          </div>
          <Dropzone
            title={de.assets.addMoreVideos}
            hint={de.assets.dropHint}
            formats={de.assets.dropFormatsVideos}
            browse={de.assets.browse}
            accept={VIDEO_ACCEPT}
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

      <ConfirmDialog
        open={pending !== null}
        title={de.assets.deleteVideoTitle}
        body={de.assets.deleteVideoBody}
        cancelLabel={de.confirm.cancel}
        confirmLabel={de.wizard.remove}
        onCancel={() => setPendingId(null)}
        onConfirm={() => {
          if (pending) void removeVideo(pending.id);
          setPendingId(null);
        }}
      />
    </div>
  );
}
