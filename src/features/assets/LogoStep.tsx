import { useRef, useState } from 'react';
import { ConfirmDialog } from '../../app/shell/ConfirmDialog';
import { de } from '../../i18n/de';
import {
  addLogoFile,
  removeLogo,
  retryLogoKnockout,
  selectLogoVariant,
} from '../../store/assetActions';
import { useProjectStore } from '../../store/projectStore';
import type { AssetFile } from '../../types/project';
import type { AssetReject } from '../../utils/assetMedia';
import { formatLogoMeta } from '../../utils/assetMedia';
import { getKnockoutFailKind } from '../../utils/logoKnockout';
import styles from './assets.module.css';
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

function LogoPanel({
  title,
  asset,
  selected,
  onSelect,
  selectLabel,
  missing,
}: {
  title: string;
  asset: AssetFile;
  selected: boolean;
  onSelect: () => void;
  selectLabel: string;
  missing: string;
}) {
  const url = useAssetObjectUrl(asset.blobKey);

  return (
    <section
      className={`${styles.logoPanel}${selected ? ` ${styles.logoPanelSelected}` : ''}`}
    >
      <h2 className={styles.panelTitle}>{title}</h2>
      <div className={styles.logoPreview}>
        {url ? (
          <img className={styles.logoImage} src={url} alt={asset.name} />
        ) : (
          <p className={styles.missing}>{missing}</p>
        )}
      </div>
      <p className={styles.metaName}>{asset.name}</p>
      <p className={styles.metaLine}>{formatLogoMeta(asset)}</p>
      <p className={styles.id}>{asset.id}</p>
      <button
        type="button"
        className={selected ? 'btn btn-primary' : 'btn btn-secondary'}
        aria-pressed={selected}
        onClick={onSelect}
      >
        {selectLabel}
      </button>
    </section>
  );
}

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
  const isSvg = original?.kind === 'svg';
  const failKind = getKnockoutFailKind();
  const failed = logo?.status === 'failed';
  const processing = logo?.status === 'processing';

  async function ingest(files: File[], slot: 'original' | 'transparent'): Promise<void> {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    const rejected = await addLogoFile(file, slot);
    setErrors(rejected ? [rejected] : []);
    setBusy(false);
  }

  if (!logo) return null;

  const liveMessage = processing
    ? de.assets.liveProcessing
    : failed
      ? failKind === 'timeout'
        ? de.assets.liveTimeout
        : de.assets.liveFailed
      : transparent
        ? de.assets.liveReady
        : '';

  return (
    <div className={styles.stack}>
      <p className="sr-only" aria-live="polite">
        {liveMessage}
      </p>

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
          <div className={styles.logoSplit}>
            <LogoPanel
              title={de.assets.originalPanel}
              asset={original}
              selected={logo.selected === 'original'}
              onSelect={() => selectLogoVariant('original')}
              selectLabel={de.assets.useOriginal}
              missing={de.assets.missingBlob}
            />

            {isSvg ? (
              <section className={styles.logoPanel}>
                <h2 className={styles.panelTitle}>{de.assets.transparentPanel}</h2>
                <p className={styles.hint}>{de.assets.svgHint}</p>
              </section>
            ) : (
              <section className={styles.logoPanel}>
                <h2 className={styles.panelTitle}>{de.assets.transparentPanel}</h2>
                {processing ? (
                  <div className={styles.processingBlock}>
                    <p className={styles.processingTitle}>{de.assets.processing}</p>
                    <p className={styles.hint}>{de.assets.processingHint}</p>
                  </div>
                ) : null}
                {failed ? (
                  <div className={styles.failBlock}>
                    <p className={styles.failed} role="status">
                      {failKind === 'timeout'
                        ? de.assets.knockoutTimeout
                        : de.assets.knockoutFailed}
                    </p>
                    {failKind !== 'timeout' ? (
                      <p className={styles.hint}>{de.assets.knockoutFailedHint}</p>
                    ) : null}
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => selectLogoVariant('original')}
                      >
                        {de.assets.useOriginal}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => retryLogoKnockout()}
                      >
                        {de.assets.retry}
                      </button>
                    </div>
                  </div>
                ) : null}
                {transparent ? (
                  <LogoPreviewTransparent
                    asset={transparent}
                    selected={logo.selected === 'transparent'}
                    missing={de.assets.missingBlob}
                  />
                ) : null}
              </section>
            )}
          </div>

          <div className={styles.actions}>
            {!isSvg && failed ? (
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

function LogoPreviewTransparent({
  asset,
  selected,
  missing,
}: {
  asset: AssetFile;
  selected: boolean;
  missing: string;
}) {
  const url = useAssetObjectUrl(asset.blobKey);

  return (
    <div>
      <div className={`${styles.logoPreview} ${styles.checkerboard}`}>
        {url ? (
          <img className={styles.logoImage} src={url} alt={asset.name} />
        ) : (
          <p className={styles.missing}>{missing}</p>
        )}
      </div>
      <p className={styles.metaName}>{asset.name}</p>
      <p className={styles.metaLine}>{formatLogoMeta(asset)}</p>
      <p className={styles.id}>{asset.id}</p>
      <button
        type="button"
        className={selected ? 'btn btn-primary' : 'btn btn-secondary'}
        aria-pressed={selected}
        onClick={() => selectLogoVariant('transparent')}
      >
        {de.assets.useTransparent}
      </button>
    </div>
  );
}
