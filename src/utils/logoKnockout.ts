import { useProjectStore } from '../store/projectStore';
import type { AssetFile } from '../types/project';
import { deleteAssetBlob, getAssetBlob, putAssetBlob } from './assetDb';
import { buildImageAsset, transparentFileName } from './assetMedia';
import { revokeObjectUrlNow } from './objectUrls';

export const LOGO_KNOCKOUT_TIMEOUT_MS = 20_000;

export type KnockoutFailKind = 'timeout' | 'error';

let jobSeq = 0;
let lastFailKind: KnockoutFailKind | null = null;

export function getKnockoutFailKind(): KnockoutFailKind | null {
  return lastFailKind;
}

export function invalidateLogoKnockout(): void {
  jobSeq += 1;
}

export function startLogoKnockout(originalBlobKey: string): void {
  const job = ++jobSeq;
  lastFailKind = null;
  void runLogoKnockout(job, originalBlobKey);
}

function persist(): void {
  useProjectStore.getState().flushPersist();
}

function originalStillCurrent(originalBlobKey: string): boolean {
  const project = useProjectStore.getState().project;
  return project?.logo.original?.blobKey === originalBlobKey;
}

function markFailed(originalBlobKey: string, kind: KnockoutFailKind): void {
  if (!originalStillCurrent(originalBlobKey)) return;
  lastFailKind = kind;
  useProjectStore.getState().updateProject({
    logo: { status: 'failed', selected: 'original' },
  });
  persist();
}

async function runLogoKnockout(job: number, originalBlobKey: string): Promise<void> {
  let settled = false;

  const timeoutId = window.setTimeout(() => {
    if (settled || job !== jobSeq) return;
    settled = true;
    markFailed(originalBlobKey, 'timeout');
    jobSeq += 1;
  }, LOGO_KNOCKOUT_TIMEOUT_MS);

  try {
    const source = await getAssetBlob(originalBlobKey);
    if (settled || job !== jobSeq) return;
    if (!source) {
      settled = true;
      markFailed(originalBlobKey, 'error');
      return;
    }

    const { removeBackground } = await import('@imgly/background-removal');
    if (settled || job !== jobSeq) return;

    const result = await removeBackground(source, {
      debug: false,
      proxyToWorker: true,
      model: 'isnet_quint8',
      output: {
        format: 'image/png',
        quality: 0.8,
      },
    });

    if (settled || job !== jobSeq) return;
    if (!(result instanceof Blob) || result.size < 1) {
      settled = true;
      markFailed(originalBlobKey, 'error');
      return;
    }

    const png =
      result.type && result.type !== 'image/png'
        ? new Blob([result], { type: 'image/png' })
        : result;

    const project = useProjectStore.getState().project;
    const originalName = project?.logo.original?.name ?? 'logo.png';
    const file = new File([png], transparentFileName(originalName), {
      type: 'image/png',
    });
    const asset: AssetFile = await buildImageAsset(file, 'image/png', 'logo');
    asset.id = 'LOGO_TRANSPARENT';
    await putAssetBlob(asset.blobKey, png);

    if (settled || job !== jobSeq || !originalStillCurrent(originalBlobKey)) {
      void deleteAssetBlob(asset.blobKey);
      return;
    }

    settled = true;
    const staleTransparent = useProjectStore.getState().project?.logo.transparent;
    useProjectStore.getState().updateProject({
      logo: {
        transparent: asset,
        status: 'ready',
      },
    });
    persist();

    if (staleTransparent && staleTransparent.blobKey !== asset.blobKey) {
      revokeObjectUrlNow(staleTransparent.blobKey);
      void deleteAssetBlob(staleTransparent.blobKey);
    }
  } catch {
    if (settled || job !== jobSeq) return;
    settled = true;
    markFailed(originalBlobKey, 'error');
  } finally {
    window.clearTimeout(timeoutId);
  }
}
