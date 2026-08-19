import { useRef, useState } from 'react';
import { ConfirmDialog } from '../../app/shell/ConfirmDialog';
import { de } from '../../i18n/de';
import { addLogoFile, removeLogo, selectLogoVariant } from '../../store/assetActions';
import { useProjectStore } from '../../store/projectStore';
import type { AssetReject } from '../../utils/assetMedia';
import { Chip } from '../wizard/Field';
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

const LOGO_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml';
const PNG_ACCEPT = '.png,image/png';

export function LogoStep() {
  const logo = useProjectStore((state) => state.project?.logo);
  const [errors, setErrors] = useState<AssetReject[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'delete' | 'replace' | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const transparentInputRef = useRef<HTMLInputElement>(null);
  const dbOk = useAssetDbAvailable();

  const original = logo?.original ?? null;
  const transparent = logo?.transparent ?? null;
  const selected =
    logo?.selected === 'transparent' && transparent ? transparent : original;
  const previewUrl = useAssetObjectUrl(selected?.blobKey ?? null);
  const isSvg = original?.kind === 'svg';

  async function ingest(files: File[], slot: 'original' | 'transparent'): Promise<void> {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    const rejected = await addLogoFile(file, slot);
    setErrors(rejected ? [rejected] : []);
    setBusy(false);
  }

  if (!logo) return null;

  return (
    <div className={styles.stack}>
      {logo.status === 'failed' ? (
        <p className={styles.failed} role="status">
          {de.assets.knockoutFailed}
        </p>
      ) : null}

      {!original ? (
        <Dropzone
          title={de.assets.dropTitleLogo}
          hint={de.assets.dropHint}
          formats={de.assets.dropFormatsLogo}
          browse={de.assets.browse}
          accept={LOGO_ACCEPT}
          multiple={false}
          disabled={busy || !dbOk}
          primary
          onFiles={(files) => void ingest(files, 'original')}
        />
      ) : (
        <>
          <div className={styles.logoPreview}>
            {previewUrl ? (
              <img
                className={styles.logoImage}
                src={previewUrl}
                alt={selected?.name ?? original.name}
              />
            ) : (
              <p className={styles.missing}>{de.assets.missingBlob}</p>
            )}
          </div>
          {selected ? <AssetMeta asset={selected} /> : null}
          <p className={styles.id}>{selected?.id}</p>

          {transparent ? (
            <div className={styles.actions}>
              <Chip
                selected={logo.selected === 'original'}
                onClick={() => selectLogoVariant('original')}
              >
                {de.assets.useOriginal}
              </Chip>
              <Chip
                selected={logo.selected === 'transparent'}
                onClick={() => selectLogoVariant('transparent')}
              >
                {de.assets.useTransparent}
              </Chip>
            </div>
          ) : null}

          <div className={styles.actions}>
            {!isSvg ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy || !dbOk}
                onClick={() => transparentInputRef.current?.click()}
              >
                {de.assets.uploadTransparent}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirm('replace')}
            >
              {de.assets.replaceLogo}
            </button>
            <button
              type="button"
              className="btn btn-tertiary"
              aria-label={`${de.wizard.remove}: ${original.name}`}
              onClick={() => setConfirm('delete')}
            >
              {de.wizard.remove}
            </button>
          </div>
          <input
            ref={replaceInputRef}
            className="sr-only"
            type="file"
            accept={LOGO_ACCEPT}
            tabIndex={-1}
            onChange={(event) => {
              const files = event.target.files ? Array.from(event.target.files) : [];
              event.target.value = '';
              void ingest(files, 'original');
            }}
          />
          <input
            ref={transparentInputRef}
            className="sr-only"
            type="file"
            accept={PNG_ACCEPT}
            tabIndex={-1}
            onChange={(event) => {
              const files = event.target.files ? Array.from(event.target.files) : [];
              event.target.value = '';
              void ingest(files, 'transparent');
            }}
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
        open={confirm !== null}
        title={
          confirm === 'replace' ? de.assets.replaceLogoTitle : de.assets.deleteLogoTitle
        }
        body={
          confirm === 'replace' ? de.assets.replaceLogoBody : de.assets.deleteLogoBody
        }
        cancelLabel={de.confirm.cancel}
        confirmLabel={confirm === 'replace' ? de.assets.replaceLogo : de.wizard.remove}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === 'delete') {
            void removeLogo();
            setConfirm(null);
            return;
          }
          setConfirm(null);
          replaceInputRef.current?.click();
        }}
      />
    </div>
  );
}
